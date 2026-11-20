import test from "node:test";
import assert from "node:assert/strict";
import {
  answerQuestion,
  createCloudflareAIClient,
} from "../src/services/ai/copilot.service.js";

const WATCH_SPACE_ID = "64f000000000000000000001";

const timelineContext = {
  events: [
    {
      eventId: "evt-introduction",
      startTime: 12,
      endTime: 18,
      eventType: "scene",
      description: "Mara enters the observatory.",
      transcript: "Mara: We need the silver key.",
      trivia: [],
      variationId: null,
      options: [],
      relevanceScore: 4,
      internalNote: "not timeline evidence",
    },
  ],
};

const bengaliTimelineContext = {
  events: [
    {
      eventId: "evt-bengali",
      description: "মারা মানমন্দিরে প্রবেশ করে।",
      transcript: "মারা বলে: রুপার চাবি দরকার।",
    },
  ],
};

const configureCloudflareEnvironment = (t) => {
  const keys = [
    "CLOUDFLARE_ACCOUNT_ID",
    "CLOUDFLARE_API_TOKEN",
    "CLOUDFLARE_AI_MODEL",
    "CLOUDFLARE_AI_TIMEOUT_MS",
  ];
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );

  process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
  process.env.CLOUDFLARE_API_TOKEN = "test-token";
  process.env.CLOUDFLARE_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
  delete process.env.CLOUDFLARE_AI_TIMEOUT_MS;

  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  });
};

const createMockAIClient = (response) => {
  const requests = [];

  return {
    requests,
    client: {
      generate: async (request) => {
        requests.push(request);
        return response;
      },
    },
  };
};

const askWith = (
  aiClient,
  question = "What does Mara say?",
  context = timelineContext,
  diagnosticLogger,
) =>
  answerQuestion(
    { question, watchSpaceId: WATCH_SPACE_ID, timelineContext: context },
    { aiClient, diagnosticLogger },
  );

test("uses Cloudflare choices response and returns a grounded Bengali answer", async (t) => {
  configureCloudflareEnvironment(t);
  let requestUrl;
  let requestOptions;
  const excerpt = "মারা মানমন্দিরে প্রবেশ করে।";
  const aiClient = createCloudflareAIClient({
    fetchImpl: async (url, options) => {
      requestUrl = url;
      requestOptions = options;
      return {
        ok: true,
        json: async () => ({
          success: true,
          errors: [],
          result: {
            choices: [
              {
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: JSON.stringify({
                    selections: [{ eventId: "evt-bengali", excerpt }],
                  }),
                  reasoning_content: "Do not use this as the answer.",
                },
              },
            ],
          },
        }),
      };
    },
  });

  const result = await askWith(
    aiClient,
    "মারা কোথায় প্রবেশ করে?",
    bengaliTimelineContext,
  );

  assert.equal(
    requestUrl,
    "https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/meta/llama-3.1-8b-instruct",
  );
  assert.equal(requestOptions.method, "POST");
  assert.equal(requestOptions.headers.Authorization, "Bearer test-token");

  const requestBody = JSON.parse(requestOptions.body);
  assert.ok(Array.isArray(requestBody.messages));
  assert.equal("model" in requestBody, false);
  assert.equal(result.answer, excerpt);
  assert.deepEqual(result.sourceEvents, ["evt-bengali"]);
  assert.ok(Number.isFinite(Date.parse(result.generatedAt)));

  const submittedEvidence = JSON.parse(requestBody.messages[1].content);
  assert.deepEqual(
    submittedEvidence.timelineEvents.map(({ eventId }) => eventId),
    ["evt-bengali"],
  );
  assert.equal(
    submittedEvidence.timelineEvents[0].description,
    bengaliTimelineContext.events[0].description,
  );
  assert.equal("internalNote" in submittedEvidence.timelineEvents[0], false);
});

test("accepts an exact canonical text excerpt and excludes the legacy description", async () => {
  const context = {
    events: [
      {
        eventId: "evt-canonical",
        text: "Mara enters the observatory.",
        description: "The captain is Mara's sister.",
      },
    ],
  };
  const { client, requests } = createMockAIClient(
    JSON.stringify({
      selections: [
        {
          eventId: "evt-canonical",
          excerpt: "Mara enters the observatory.",
        },
      ],
    }),
  );

  const result = await askWith(client, "Who enters?", context);
  const request = JSON.parse(requests[0].messages[1].content);

  assert.equal(result.answer, "Mara enters the observatory.");
  assert.deepEqual(result.sourceEvents, ["evt-canonical"]);
  assert.equal(request.timelineEvents[0].text, context.events[0].text);
  assert.equal("description" in request.timelineEvents[0], false);
});

test("rejects a legacy description excerpt when canonical text is present", async () => {
  const context = {
    events: [
      {
        eventId: "evt-canonical",
        text: "Mara enters the observatory.",
        description: "The captain is Mara's sister.",
      },
    ],
  };
  const { client } = createMockAIClient(
    JSON.stringify({
      selections: [
        {
          eventId: "evt-canonical",
          excerpt: "The captain is Mara's sister.",
        },
      ],
    }),
  );

  const result = await askWith(client, "Who is the captain?", context);

  assert.equal(
    result.answer,
    "This information is unavailable in the title metadata.",
  );
  assert.deepEqual(result.sourceEvents, []);
});

test("rejects blank canonical text without falling back to description", async () => {
  const context = {
    events: [
      {
        eventId: "evt-blank-text",
        text: "   ",
        description: "Mara enters the observatory.",
      },
    ],
  };
  const { client, requests } = createMockAIClient(
    JSON.stringify({
      selections: [
        {
          eventId: "evt-blank-text",
          excerpt: "Mara enters the observatory.",
        },
      ],
    }),
  );

  const result = await askWith(client, "Who enters?", context);
  const request = JSON.parse(requests[0].messages[1].content);

  assert.equal(
    result.answer,
    "This information is unavailable in the title metadata.",
  );
  assert.deepEqual(result.sourceEvents, []);
  assert.equal(request.timelineEvents[0].text, "   ");
  assert.equal("description" in request.timelineEvents[0], false);
});

test("accepts an exact excerpt from a legacy description", async () => {
  const context = {
    events: [
      {
        eventId: "evt-legacy",
        description: "A silver key opens the observatory.",
      },
    ],
  };
  const { client } = createMockAIClient(
    JSON.stringify({
      selections: [
        {
          eventId: "evt-legacy",
          excerpt: "A silver key opens the observatory.",
        },
      ],
    }),
  );

  const result = await askWith(client, "What opens the observatory?", context);

  assert.equal(result.answer, "A silver key opens the observatory.");
  assert.deepEqual(result.sourceEvents, ["evt-legacy"]);
});

test("accepts an exact Bengali excerpt from canonical text", async () => {
  const excerpt = "মারা মানমন্দিরে প্রবেশ করে।";
  const context = {
    events: [
      {
        eventId: "evt-bengali-text",
        text: excerpt,
        description: "বর্ণনা আলাদা।",
      },
    ],
  };
  const { client } = createMockAIClient(
    JSON.stringify({
      selections: [{ eventId: "evt-bengali-text", excerpt }],
    }),
  );

  const result = await askWith(client, "মারা কোথায় প্রবেশ করে?", context);

  assert.equal(result.answer, excerpt);
  assert.deepEqual(result.sourceEvents, ["evt-bengali-text"]);
});

test("returns the safe unavailable answer when Cloudflare truncates generation", async (t) => {
  configureCloudflareEnvironment(t);
  const aiClient = createCloudflareAIClient({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        success: true,
        result: {
          choices: [
            {
              finish_reason: "length",
              message: {
                role: "assistant",
                content: JSON.stringify({
                  selections: [
                    {
                      eventId: "evt-introduction",
                      excerpt: "Mara enters the observatory.",
                    },
                  ],
                }),
                reasoning_content: "A fabricated incomplete answer.",
              },
            },
          ],
        },
      }),
    }),
  });

  const result = await askWith(aiClient);

  assert.equal(
    result.answer,
    "This information is unavailable in the title metadata.",
  );
  assert.deepEqual(result.sourceEvents, []);
  assert.ok(Number.isFinite(Date.parse(result.generatedAt)));
});

test("throws on Cloudflare HTTP failure", async (t) => {
  configureCloudflareEnvironment(t);
  const aiClient = createCloudflareAIClient({
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    }),
  });

  await assert.rejects(askWith(aiClient), /HTTP 401/);
});

test("throws on Cloudflare network failure", async (t) => {
  configureCloudflareEnvironment(t);
  const aiClient = createCloudflareAIClient({
    fetchImpl: async () => {
      throw new Error("connection reset");
    },
  });

  await assert.rejects(askWith(aiClient), /network request failed/);
});

test("aborts a Cloudflare request after the configured timeout", async (t) => {
  configureCloudflareEnvironment(t);
  const aiClient = createCloudflareAIClient({
    timeoutMs: 5,
    fetchImpl: async (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => reject(new Error("request aborted")),
          { once: true },
        );
      }),
  });

  await assert.rejects(askWith(aiClient), /timed out after 5ms/);
});

test("returns unavailable when Workers AI returns malformed JSON content", async (t) => {
  configureCloudflareEnvironment(t);
  const aiClient = createCloudflareAIClient({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        success: true,
        result: { response: "not JSON" },
      }),
    }),
  });

  const result = await askWith(aiClient);

  assert.equal(
    result.answer,
    "This information is unavailable in the title metadata.",
  );
  assert.deepEqual(result.sourceEvents, []);
});

test("throws when the Workers AI response envelope is malformed", async (t) => {
  configureCloudflareEnvironment(t);
  const aiClient = createCloudflareAIClient({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ success: true, result: {} }),
    }),
  });

  await assert.rejects(askWith(aiClient), /returned an invalid response/);
});

test("returns unavailable when the model cites an event outside retrieved context", async () => {
  const { client } = createMockAIClient(
    JSON.stringify({
      selections: [
        {
          eventId: "evt-not-retrieved",
          excerpt: "The captain is Mara's sister.",
        },
      ],
    }),
  );

  const result = await askWith(
    client,
    "What is Mara's relationship to the captain?",
  );

  assert.equal(
    result.answer,
    "This information is unavailable in the title metadata.",
  );
  assert.deepEqual(result.sourceEvents, []);
});

test("a valid event ID cannot authorize a fabricated excerpt or answer", async () => {
  const fabricated = "Mara is the captain's sister.";
  const { client } = createMockAIClient(
    JSON.stringify({
      answer: fabricated,
      sourceEvents: ["evt-introduction"],
      selections: [{ eventId: "evt-introduction", excerpt: fabricated }],
    }),
  );

  const result = await askWith(client);

  assert.equal(
    result.answer,
    "This information is unavailable in the title metadata.",
  );
  assert.deepEqual(result.sourceEvents, []);
  assert.equal(result.answer.includes(fabricated), false);
});

test("returns only exact selected metadata when the model also gives mixed supported and fabricated prose", async () => {
  const fabricated = "Mara is the captain's sister.";
  const { client } = createMockAIClient(
    JSON.stringify({
      answer: `Mara enters the observatory. ${fabricated}`,
      selections: [
        {
          eventId: "evt-introduction",
          excerpt: "Mara enters the observatory.",
        },
      ],
    }),
  );

  const result = await askWith(client);

  assert.equal(result.answer, "Mara enters the observatory.");
  assert.equal(result.answer.includes(fabricated), false);
  assert.deepEqual(result.sourceEvents, ["evt-introduction"]);
});

test("does not allow an excerpt from one event to be attributed to another", async () => {
  const context = {
    events: [
      timelineContext.events[0],
      {
        eventId: "evt-captain",
        description: "The captain is Mara's sister.",
      },
    ],
  };
  const { client } = createMockAIClient(
    JSON.stringify({
      selections: [
        {
          eventId: "evt-introduction",
          excerpt: "The captain is Mara's sister.",
        },
      ],
    }),
  );

  const result = await askWith(client, "Who is the captain?", context);

  assert.equal(
    result.answer,
    "This information is unavailable in the title metadata.",
  );
  assert.deepEqual(result.sourceEvents, []);
});

test("uses general fallback when the model returns empty evidence selections", async (t) => {
  const responses = [
    JSON.stringify({ selections: [] }),
    "A general knowledge answer for this question.",
  ];

  const requests = [];

  const aiClient = {
    generate: async (request) => {
      requests.push(request);
      return responses.shift();
    },
  };

  const result = await askWith(aiClient);

  assert.equal(result.answerMode, "general");
  assert.match(result.answer, /General knowledge/i);
  assert.deepEqual(result.sourceEvents, []);
  assert.equal(requests.length, 2);
});

test("returns unavailable for empty or malformed evidence selections", async (t) => {
  const invalidResponses = [
    JSON.stringify({ selections: [{ eventId: "evt-introduction" }] }),
    JSON.stringify({
      selections: [{ eventId: "evt-introduction", excerpt: "   " }],
    }),
  ];

  for (const response of invalidResponses) {
    const { client } = createMockAIClient(response);
    const result = await askWith(client);

    assert.equal(
      result.answer,
      "This information is unavailable in the title metadata.",
    );
    assert.deepEqual(result.sourceEvents, []);
  }
});

test("classifies model selection diagnostics without logging evidence content", async () => {
  const cases = [
    {
      name: "empty_selection",
      response: JSON.stringify({ selections: [] }),
      expected: {
        modelFinishReason: null,
        responseContentPresent: true,
        parsedSelectionCount: 0,
        rejectionCategory: "empty_selection",
        finalAcceptedCitationCount: 0,
        fallbackMode: "general",
      },
    },
    {
      name: "malformed_json",
      response: "not JSON",
      expected: {
        modelFinishReason: null,
        responseContentPresent: true,
        parsedSelectionCount: null,
        rejectionCategory: "malformed_json",
        finalAcceptedCitationCount: 0,
      },
    },
    {
      name: "invalid_event_id",
      response: JSON.stringify({
        selections: [{ eventId: "evt-not-retrieved", excerpt: "An excerpt." }],
      }),
      expected: {
        modelFinishReason: null,
        responseContentPresent: true,
        parsedSelectionCount: 1,
        rejectionCategory: "invalid_event_id",
        finalAcceptedCitationCount: 0,
      },
    },
    {
      name: "invalid_excerpt",
      response: JSON.stringify({
        selections: [
          {
            eventId: "evt-introduction",
            excerpt: "A fabricated excerpt.",
          },
        ],
      }),
      expected: {
        modelFinishReason: null,
        responseContentPresent: true,
        parsedSelectionCount: 1,
        rejectionCategory: "invalid_excerpt",
        finalAcceptedCitationCount: 0,
      },
    },
    {
      name: "truncated_output",
      response: {
        choices: [
          {
            finish_reason: "length",
            message: { content: '{"selections":[]}' },
          },
        ],
      },
      expected: {
        modelFinishReason: "length",
        responseContentPresent: true,
        parsedSelectionCount: null,
        rejectionCategory: "truncated_output",
        finalAcceptedCitationCount: 0,
      },
    },
    {
      name: "accepted",
      response: JSON.stringify({
        selections: [
          {
            eventId: "evt-introduction",
            excerpt: "Mara enters the observatory.",
          },
        ],
      }),
      expected: {
        modelFinishReason: null,
        responseContentPresent: true,
        parsedSelectionCount: 1,
        rejectionCategory: null,
        finalAcceptedCitationCount: 1,
      },
    },
  ];

  for (const diagnosticCase of cases) {
    const diagnostics = [];
    const { client } = createMockAIClient(diagnosticCase.response);
    await askWith(
      client,
      "A private question that must not be logged",
      timelineContext,
      (diagnostic) => diagnostics.push(diagnostic),
    );

    assert.equal(diagnostics.length, 1, diagnosticCase.name);
    const [diagnostic] = diagnostics;
    assert.match(diagnostic.requestId, /^[0-9a-f-]{36}$/i);
    assert.equal(diagnostic.retrievedCandidateCount, 1);
    assert.deepEqual(
      Object.fromEntries(
        Object.entries(diagnostic).filter(([key]) => key !== "requestId"),
      ),
      {
        event: "watchspace.ai_qa",
        watchSpaceId: WATCH_SPACE_ID,
        watchSpaceLookupOutcome: "not_attempted",
        publishedTitleLookupOutcome: "not_attempted",
        timelineEventCount: 1,
        playbackPositionSeconds: null,
        temporalCandidateCount: null,
        retrievedCandidateCount: 1,
        ...diagnosticCase.expected,
      },
    );
    assert.equal(
      JSON.stringify(diagnostic).includes(
        "A private question that must not be logged",
      ),
      false,
    );
    assert.equal(
      JSON.stringify(diagnostic).includes("Mara enters the observatory."),
      false,
    );
  }
});

test("logs provider errors without error details and preserves the thrown error", async () => {
  const diagnostics = [];
  const aiClient = {
    generate: async () => {
      throw new Error("sensitive-provider-detail");
    },
  };

  await assert.rejects(
    answerQuestion(
      {
        question: "A private question that must not be logged",
        watchSpaceId: WATCH_SPACE_ID,
        timelineContext,
      },
      {
        aiClient,
        diagnosticLogger: (diagnostic) => diagnostics.push(diagnostic),
      },
    ),
    /sensitive-provider-detail/,
  );

  assert.equal(diagnostics.length, 1);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(diagnostics[0]).filter(([key]) => key !== "requestId"),
    ),
    {
      event: "watchspace.ai_qa",
      watchSpaceId: WATCH_SPACE_ID,
      watchSpaceLookupOutcome: "not_attempted",
      publishedTitleLookupOutcome: "not_attempted",
      timelineEventCount: 1,
      playbackPositionSeconds: null,
      temporalCandidateCount: null,
      retrievedCandidateCount: 1,
      modelFinishReason: null,
      responseContentPresent: false,
      parsedSelectionCount: null,
      rejectionCategory: "provider_error",
      finalAcceptedCitationCount: 0,
    },
  );
  assert.equal(
    JSON.stringify(diagnostics[0]).includes("sensitive-provider-detail"),
    false,
  );
});

test("logs retrieval exceptions with the request ID and published-title outcome", async () => {
  const diagnostics = [];
  const retrieveTimelineContext = async (_input, { diagnostics: state }) => {
    Object.assign(state, {
      watchSpaceLookupOutcome: "found",
      publishedTitleLookupOutcome: "not_found",
      playbackPositionSeconds: 42,
    });
    throw new Error("Published title not found");
  };

  await assert.rejects(
    answerQuestion(
      {
        question: "A private question that must not be logged",
        watchSpaceId: WATCH_SPACE_ID,
        requestId: "request-id-from-controller",
      },
      {
        retrieveTimelineContext,
        diagnosticLogger: (diagnostic) => diagnostics.push(diagnostic),
      },
    ),
    /Published title not found/,
  );

  assert.deepEqual(diagnostics, [
    {
      event: "watchspace.ai_qa",
      requestId: "request-id-from-controller",
      watchSpaceId: WATCH_SPACE_ID,
      watchSpaceLookupOutcome: "found",
      publishedTitleLookupOutcome: "not_found",
      timelineEventCount: null,
      playbackPositionSeconds: 42,
      temporalCandidateCount: null,
      retrievedCandidateCount: 0,
      modelFinishReason: null,
      responseContentPresent: false,
      parsedSelectionCount: null,
      rejectionCategory: "published_title_not_found",
      finalAcceptedCitationCount: 0,
    },
  ]);
  assert.equal(JSON.stringify(diagnostics).includes("private question"), false);
});

test("deduplicates citations from verified excerpts only", async () => {
  const { client } = createMockAIClient(
    JSON.stringify({
      selections: [
        {
          eventId: "evt-introduction",
          excerpt: "Mara enters",
        },
        {
          eventId: "evt-introduction",
          excerpt: "observatory.",
        },
        {
          eventId: "evt-introduction",
          excerpt: "Mara enters",
        },
      ],
    }),
  );

  const result = await askWith(client);

  assert.equal(result.answer, "Mara enters\nobservatory.");
  assert.deepEqual(result.sourceEvents, ["evt-introduction"]);
});

test("uses general fallback when retrieval has no evidence", async () => {
  let calls = 0;

  const aiClient = {
    generate: async () => {
      calls += 1;
      return "A general knowledge answer.";
    },
  };

  const result = await answerQuestion(
    {
      question: "Who owns the spaceship?",
      watchSpaceId: WATCH_SPACE_ID,
      timelineContext: { events: [] },
    },
    { aiClient },
  );
  assert.equal(result.answerMode, "general");
  assert.match(result.answer, /General knowledge/i);
  assert.deepEqual(result.sourceEvents, []);
  assert.equal(calls, 1);
});

test("logs an empty timeline outcome without invoking the AI", async () => {
  const diagnostics = [];
  let aiCalls = 0;

  const aiClient = {
    generate: async () => {
      aiCalls += 1;
      return "A general knowledge answer.";
    },
  };

  const retrieveTimelineContext = async (_input, { diagnostics: state }) => {
    Object.assign(state, {
      watchSpaceLookupOutcome: "found",
      publishedTitleLookupOutcome: "found",
      timelineEventCount: 0,
      playbackPositionSeconds: 30,
      temporalCandidateCount: 0,
      retrievedCandidateCount: 0,
    });

    return {
      currentTime: 30,
      timelineEventCount: 0,
      temporalCandidateCount: 0,
      retrievedCandidateCount: 0,
      events: [],
    };
  };

  const result = await answerQuestion(
    {
      question: "A private question that must not be logged",
      watchSpaceId: WATCH_SPACE_ID,
      requestId: "test-request-empty-timeline",
    },
    {
      aiClient,
      retrieveTimelineContext,
      diagnosticLogger: (diagnostic) => diagnostics.push(diagnostic),
    },
  );

  assert.deepEqual(result.sourceEvents, []);
  assert.equal(result.answerMode, "general");
  assert.match(result.answer, /General knowledge/i);
  assert.deepEqual(result.sourceEvents, []);
  assert.equal(aiCalls, 1);

  assert.deepEqual(diagnostics, [
    {
      event: "watchspace.ai_qa",
      requestId: "test-request-empty-timeline",
      watchSpaceId: WATCH_SPACE_ID,
      watchSpaceLookupOutcome: "found",
      publishedTitleLookupOutcome: "found",
      timelineEventCount: 0,
      playbackPositionSeconds: 30,
      temporalCandidateCount: 0,
      retrievedCandidateCount: 0,
      modelFinishReason: null,
      responseContentPresent: false,
      parsedSelectionCount: null,
      rejectionCategory: "no_timeline_events",
      finalAcceptedCitationCount: 0,
      fallbackMode: "general",
    },
  ]);

  assert.equal(JSON.stringify(diagnostics).includes("private question"), false);
});

test("logs a timeline with no temporal candidates separately", async () => {
  const diagnostics = [];

  const retrieveTimelineContext = async (_input, { diagnostics: state }) => {
    Object.assign(state, {
      watchSpaceLookupOutcome: "found",
      publishedTitleLookupOutcome: "found",
      timelineEventCount: 2,
      playbackPositionSeconds: 10,
      temporalCandidateCount: 0,
      retrievedCandidateCount: 0,
    });

    return {
      currentTime: 10,
      timelineEventCount: 2,
      temporalCandidateCount: 0,
      retrievedCandidateCount: 0,
      events: [],
    };
  };

  await answerQuestion(
    {
      question: "What happens later?",
      watchSpaceId: WATCH_SPACE_ID,
    },
    {
      aiClient: {
        generate: async () => "A general knowledge answer.",
      },
      retrieveTimelineContext,
      diagnosticLogger: (diagnostic) => diagnostics.push(diagnostic),
    },
  );

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].timelineEventCount, 2);
  assert.equal(diagnostics[0].playbackPositionSeconds, 10);
  assert.equal(diagnostics[0].temporalCandidateCount, 0);
  assert.equal(diagnostics[0].retrievedCandidateCount, 0);
  assert.equal(diagnostics[0].rejectionCategory, "no_temporal_candidates");
});

test("does not treat temporal candidates as answer evidence without a valid model selection", async () => {
  const responses = [
    JSON.stringify({ selections: [] }),
    "A general knowledge answer.",
  ];

  const requests = [];

  const client = {
    generate: async (request) => {
      requests.push(request);
      return responses.shift();
    },
  };
  const candidateContext = {
    events: [
      {
        eventId: "evt-current-candidate",
        description: "A visitor steps inside the building.",
      },
    ],
  };

  const result = await answerQuestion(
    {
      question: "Who enters the observatory?",
      watchSpaceId: WATCH_SPACE_ID,
      timelineContext: candidateContext,
    },
    { aiClient: client },
  );

  assert.equal(requests.length, 2);
  assert.equal(result.answerMode, "general");
  assert.match(result.answer, /General knowledge/i);
  assert.deepEqual(result.sourceEvents, []);
});

test("uses retrieval.service when no timeline context is supplied", async () => {
  const { client, requests } = createMockAIClient(
    JSON.stringify({
      selections: [
        {
          eventId: "evt-introduction",
          excerpt: "Mara enters the observatory.",
        },
      ],
    }),
  );
  const retrievalCalls = [];
  const diagnostics = [];
  const retrieveTimelineContext = async (input, options) => {
    retrievalCalls.push({ input, options });
    return timelineContext;
  };

  await answerQuestion(
    {
      question: "Who enters the observatory?",
      watchSpaceId: WATCH_SPACE_ID,
      requestId: "request-id-from-controller",
    },
    {
      aiClient: client,
      retrieveTimelineContext,
      diagnosticLogger: (diagnostic) => diagnostics.push(diagnostic),
    },
  );

  assert.deepEqual(retrievalCalls[0].input, {
    question: "Who enters the observatory?",
    watchSpaceId: WATCH_SPACE_ID,
  });
  assert.equal(
    retrievalCalls[0].options.diagnostics.watchSpaceId,
    WATCH_SPACE_ID,
  );
  assert.equal(diagnostics[0].requestId, "request-id-from-controller");
  assert.equal(requests.length, 1);
});

test("rejects invalid questions, WatchSpace IDs, and timeline context", async () => {
  await assert.rejects(
    answerQuestion({
      question: " ",
      watchSpaceId: WATCH_SPACE_ID,
      timelineContext,
    }),
    /question is required/,
  );
  await assert.rejects(
    answerQuestion({
      question: "What happened?",
      watchSpaceId: "invalid",
      timelineContext,
    }),
    /valid WatchSpace ID/,
  );
  await assert.rejects(
    answerQuestion({
      question: "What happened?",
      watchSpaceId: WATCH_SPACE_ID,
      timelineContext: {},
    }),
    /events array/,
  );
});

import User from "../models/User.js";
import Title from "../models/Title.js";
import WatchSpace from "../models/WatchSpace.js";
import ChatMessage from "../models/ChatMessage.js";

const MONTH_COUNT = 10;
const RECENT_ACTIVITY_LIMIT = 8;

const getMonthKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const getMonthRange = (now = new Date()) => {
  const currentMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const date = new Date(
      Date.UTC(
        currentMonth.getUTCFullYear(),
        currentMonth.getUTCMonth() - (MONTH_COUNT - index - 1),
        1,
      ),
    );

    return {
      key: getMonthKey(date),
      label: date.toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      }),
    };
  });
};

const getMonthlyCounts = async (Model, dateField, startDate) =>
  Model.aggregate([
    {
      $match: {
        [dateField]: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: `$${dateField}`,
            timezone: "UTC",
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

const toCountMap = (rows) =>
  new Map(rows.map((row) => [row._id, row.count]));

const buildMonthlySeries = (months, rows) => {
  const counts = toCountMap(rows);

  return months.map((month) => ({
    month: month.label,
    monthKey: month.key,
    count: counts.get(month.key) || 0,
  }));
};

const getRecentActivity = async () => {
  const [users, watchSpaces, messages] = await Promise.all([
    User.find({})
      .select("_id name avatar role createdAt")
      .sort({ createdAt: -1 })
      .limit(RECENT_ACTIVITY_LIMIT)
      .lean(),
    WatchSpace.find({})
      .select("_id title host status createdAt scheduledAt startedAt endedAt")
      .populate("title", "name releaseYear")
      .populate("host", "name avatar")
      .sort({ createdAt: -1 })
      .limit(RECENT_ACTIVITY_LIMIT)
      .lean(),
    ChatMessage.find({})
      .select("_id watchSpace sender createdAt")
      .populate("sender", "name avatar")
      .populate("watchSpace", "_id status")
      .sort({ createdAt: -1 })
      .limit(RECENT_ACTIVITY_LIMIT)
      .lean(),
  ]);

  const activity = [
    ...users.map((user) => ({
      id: String(user._id),
      type: "user_registered",
      createdAt: user.createdAt,
      user: {
        id: String(user._id),
        name: user.name,
        avatar: user.avatar || "",
        role: user.role,
      },
    })),
    ...watchSpaces.map((watchSpace) => ({
      id: String(watchSpace._id),
      type: "watch_space_created",
      createdAt: watchSpace.createdAt,
      watchSpace: {
        id: String(watchSpace._id),
        status: watchSpace.status,
        title: watchSpace.title
          ? {
              id: String(watchSpace.title._id),
              name: watchSpace.title.name,
              releaseYear: watchSpace.title.releaseYear ?? null,
            }
          : null,
        host: watchSpace.host
          ? {
              id: String(watchSpace.host._id),
              name: watchSpace.host.name,
              avatar: watchSpace.host.avatar || "",
            }
          : null,
      },
    })),
    ...messages.map((message) => ({
      id: String(message._id),
      type: "chat_message",
      createdAt: message.createdAt,
      user: message.sender
        ? {
            id: String(message.sender._id),
            name: message.sender.name,
            avatar: message.sender.avatar || "",
          }
        : null,
      watchSpace: message.watchSpace
        ? {
            id: String(message.watchSpace._id),
            status: message.watchSpace.status,
          }
        : null,
    })),
  ];

  return activity
    .filter((item) => item.createdAt)
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .slice(0, RECENT_ACTIVITY_LIMIT);
};

export const getAdminDashboardOverview = async (now = new Date()) => {
  const months = getMonthRange(now);
  const firstMonth = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - (MONTH_COUNT - 1),
      1,
    ),
  );

  const [
    userRoleRows,
    watchSpaceStatusRows,
    titleRows,
    messageCount,
    participantRows,
    aiUsageRows,
    monthlyUsers,
    monthlyWatchSpaces,
    monthlyMessages,
    recentActivity,
  ] = await Promise.all([
    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    WatchSpace.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Title.aggregate([
      {
        $group: {
          _id: "$isPublished",
          count: { $sum: 1 },
        },
      },
    ]),
    ChatMessage.countDocuments({}),
    WatchSpace.aggregate([
      { $unwind: "$participants" },
      {
        $group: {
          _id: null,
          totalParticipantRecords: { $sum: 1 },
          uniqueParticipants: { $addToSet: "$participants.user" },
        },
      },
      {
        $project: {
          _id: 0,
          totalParticipantRecords: 1,
          uniqueParticipants: { $size: "$uniqueParticipants" },
        },
      },
    ]),
    WatchSpace.aggregate([
      {
        $group: {
          _id: null,
          totalAIQuestions: { $sum: { $ifNull: ["$aiQuestionsAsked", 0] } },
        },
      },
      { $project: { _id: 0, totalAIQuestions: 1 } },
    ]),
    getMonthlyCounts(User, "createdAt", firstMonth),
    getMonthlyCounts(WatchSpace, "createdAt", firstMonth),
    getMonthlyCounts(ChatMessage, "createdAt", firstMonth),
    getRecentActivity(),
  ]);

  const userRoles = {
    admin: 0,
    host: 0,
    viewer: 0,
  };
  userRoleRows.forEach(({ _id, count }) => {
    if (Object.hasOwn(userRoles, _id)) userRoles[_id] = count;
  });

  const watchSpaceStatuses = {
    active: 0,
    ended: 0,
    scheduled: 0,
    waiting: 0,
  };
  watchSpaceStatusRows.forEach(({ _id, count }) => {
    if (Object.hasOwn(watchSpaceStatuses, _id)) {
      watchSpaceStatuses[_id] = count;
    }
  });

  const titles = {
    published: 0,
    drafts: 0,
  };
  titleRows.forEach(({ _id, count }) => {
    if (_id === true) titles.published = count;
    if (_id === false || _id === null) titles.drafts += count;
  });

  const participants = participantRows[0] || {
    totalParticipantRecords: 0,
    uniqueParticipants: 0,
  };

  return {
    generatedAt: now.toISOString(),
    users: {
      total: Object.values(userRoles).reduce((sum, count) => sum + count, 0),
      ...userRoles,
    },
    watchSpaces: {
      total: Object.values(watchSpaceStatuses).reduce(
        (sum, count) => sum + count,
        0,
      ),
      ...watchSpaceStatuses,
    },
    titles: {
      total: titles.published + titles.drafts,
      ...titles,
    },
    engagement: {
      totalMessages: messageCount,
      totalParticipantRecords: participants.totalParticipantRecords,
      uniqueParticipants: participants.uniqueParticipants,
      participantRecordDefinition:
        "Counts embedded WatchSpace.participants entries; uniqueParticipants counts distinct user IDs in those entries. The separate WatchSpace.host field is not added unless that user also has a participant entry.",
    },
    ai: {
      totalQuestions: aiUsageRows[0]?.totalAIQuestions || 0,
      metricDefinition:
        "Sum of WatchSpace.aiQuestionsAsked. Historical per-question timestamps are not stored, so monthly AI usage is not available.",
    },
    charts: {
      watchSpaceStatusDistribution: Object.entries(watchSpaceStatuses).map(
        ([status, count]) => ({ status, count }),
      ),
      userRoleDistribution: Object.entries(userRoles).map(([role, count]) => ({
        role,
        count,
      })),
      monthlyPlatformGrowth: {
        users: buildMonthlySeries(months, monthlyUsers),
        watchSpaces: buildMonthlySeries(months, monthlyWatchSpaces),
        messages: buildMonthlySeries(months, monthlyMessages),
      },
    },
    recentActivity,
  };
};

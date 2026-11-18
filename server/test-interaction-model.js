import mongoose from "mongoose";
import assert from "node:assert/strict";
import Interaction from "./src/models/Interaction.js";

const id = new mongoose.Types.ObjectId();

const valid = new Interaction({
  user: id,
  title: id,
  rating: 5,
  completionPercentage: 100,
});

assert.equal(valid.validateSync(), undefined);
console.log("PASS: valid interaction");

const badRating = new Interaction({
  user: id,
  title: id,
  rating: 6,
});

assert.ok(badRating.validateSync()?.errors.rating);
console.log("PASS: rating validation");

const badCompletion = new Interaction({
  user: id,
  title: id,
  completionPercentage: 101,
});

assert.ok(badCompletion.validateSync()?.errors.completionPercentage);
console.log("PASS: completion validation");

const hasUniqueIndex = Interaction.schema.indexes().some(
  ([fields, options]) =>
    fields.user === 1 &&
    fields.title === 1 &&
    options.unique,
);

assert.ok(hasUniqueIndex);
console.log("PASS: unique user-title index");

console.log("All 4 tests passed.");

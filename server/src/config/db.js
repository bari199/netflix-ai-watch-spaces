// import mongoose from "mongoose";

// const connectDB = async () => {
//   try {
//     const connection = await mongoose.connect(process.env.MONGODB_URI);

//     console.log(`MongoDB connected: ${connection.connection.host}`);
//   } catch (error) {
//     console.error("MongoDB connection failed:", error.message);
//     process.exit(1);
//   }
// };

// export default connectDB;

import mongoose from "mongoose";

const connectDB = async ({ useTestDatabase = false } = {}) => {
  try {
    const mongoUri = useTestDatabase
      ? process.env.MONGODB_TEST_URI
      : process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        useTestDatabase
          ? "MONGODB_TEST_URI is missing"
          : "MONGODB_URI is missing",

      );
    }

    const connection = await mongoose.connect(mongoUri);

    console.log(`MongoDB connected: ${connection.connection.host}`);

    console.log(`Database: ${connection.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export default connectDB;

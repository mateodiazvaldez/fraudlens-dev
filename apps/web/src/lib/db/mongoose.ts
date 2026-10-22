import "server-only";
import mongoose from "mongoose";

type ConnectionCache = {
  pending: Promise<typeof mongoose> | null;
};

const globalForMongo = globalThis as typeof globalThis & {
  fraudlensMongo?: ConnectionCache;
};
const cache = (globalForMongo.fraudlensMongo ??= { pending: null });

/** Reutiliza la conexión por proceso, incluso durante hot reload. */
export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI en el entorno del servidor.");
  if (mongoose.connection.readyState === 1) return mongoose;

  if (!cache.pending) {
    cache.pending = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
  }

  const pending = cache.pending;
  try {
    return await pending;
  } finally {
    if (cache.pending === pending) cache.pending = null;
  }
}

import mongoose from "mongoose"

let cached = global._mongooseCache
if (!cached) {
    cached = global._mongooseCache = { conn: null, promise: null }
}

const connectDb = async () => {
    if (cached.conn) {
        return cached.conn
    }
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URL, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 30000,
            bufferCommands: false,
        })
    }
    try {
        cached.conn = await cached.promise
        console.log("db connected")
    } catch (error) {
        cached.promise = null
        console.log("db connection error:", error)
        throw error
    }
    return cached.conn
}

export default connectDb
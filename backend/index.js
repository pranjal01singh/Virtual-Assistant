import express from "express"
import dotenv from "dotenv"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envCandidates = [
    path.join(__dirname, "..", ".env"),
    path.join(__dirname, ".env")
]
for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath })
        break
    }
}
import connectDb from "./config/db.js"
import authRouter from "./routes/auth.routes.js"
import cors from "cors"
import cookieParser from "cookie-parser"
import userRouter from "./routes/user.routes.js"


const app=express()
const allowedOrigins=(process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
const isAllowedOrigin=(origin)=>{
    if(!origin) return true
    if(allowedOrigins.includes(origin)) return true
    return /^http:\/\/localhost:\d+$/.test(origin)
}
app.use(cors({
    origin:(origin,callback)=>{
        if(isAllowedOrigin(origin)){
            return callback(null,true)
        }
        return callback(new Error("Not allowed by CORS"))
    },
    credentials:true
}))
const port=process.env.PORT || 5000
app.use(express.json())
app.use(cookieParser())
app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)


app.listen(port,()=>{
    connectDb()
    console.log("server started")
})


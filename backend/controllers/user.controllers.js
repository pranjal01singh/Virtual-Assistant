 import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import User from "../models/user.model.js"
import moment from "moment"
 export const getCurrentUser=async (req,res)=>{
    try {
        const userId=req.userId
        const user=await User.findById(userId).select("-password")
        if(!user){
return res.status(400).json({message:"user not found"})
        }

   return res.status(200).json(user)     
    } catch (error) {
       return res.status(400).json({message:"get current user error"}) 
    }
}

export const updateAssistant=async (req,res)=>{
   try {
      const {assistantName,imageUrl}=req.body
      let assistantImage;
if(req.file){
   assistantImage=await uploadOnCloudinary(req.file.path)
}else{
   assistantImage=imageUrl
}

const user=await User.findByIdAndUpdate(req.userId,{
   assistantName,assistantImage
},{new:true}).select("-password")
return res.status(200).json(user)

      
   } catch (error) {
       return res.status(400).json({message:"updateAssistantError user error"}) 
   }
}


export const askToAssistant=async (req,res)=>{
   try {
      const {command}=req.body
      const user=await User.findById(req.userId);
      user.history.push(command)
      await user.save()
      const userName=user.name
      const assistantName=user.assistantName
      let result
      try {
         result=await geminiResponse(command,assistantName,userName)
      } catch (e) {
         const detail = e?.message || "unknown error"
         return res.status(502).json({response:`assistant service unavailable: ${detail}`, error: detail})
      }

      if(!result || typeof result!=="string"){
         return res.status(502).json({response:"assistant service unavailable, please try again"})
      }

      const commandText = (command || "").trim()
      const normalizedCommandText = commandText.toLowerCase()

      const buildSearchQuery = (text) => {
         return text
            .toLowerCase()
            .replace(/\b(?:play|search|open|launch|go to|start|watch|find)\b/g, " ")
            .replace(/\bon youtube\b/g, " ")
            .replace(/\byoutube\b/g, " ")
            .replace(/\b(?:songs?|videos?|video)\b/g, " ")
            .replace(/\bplease\b/g, " ")
            .replace(/[^a-z0-9\s]+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
      }

      const buildTabText = (text) => {
         return text
            .replace(/\b(?:open|new|tab|page|write|type|show|display|put|and|please|for me|here)\b/gi, " ")
            .replace(/\s+/g, " ")
            .trim()
      }

      const inferFallbackType = () => {
         if (/\byoutube\b/.test(normalizedCommandText) && /\b(?:play|search|open|launch|go to|watch)\b/.test(normalizedCommandText)) {
            return 'youtube-play'
         }

         if (/\b(?:new tab|new page)\b/.test(normalizedCommandText) && /\b(?:write|type|show|display|put)\b/.test(normalizedCommandText)) {
            return 'open-new-tab'
         }

         if (/\b(?:google|search)\b/.test(normalizedCommandText)) {
            return 'google-search'
         }

         return null
      }

      const rawText = result.trim()
      let gemResult
      try {
         gemResult = JSON.parse(rawText)
      } catch (e) {
         const jsonMatch = rawText.match(/{[\s\S]*}/)
         if(!jsonMatch){
            return res.status(400).json({response:"sorry, i can't understand"})
         }
         try {
            gemResult=JSON.parse(jsonMatch[0])
         } catch (err) {
            return res.status(400).json({response:"sorry, i can't understand"})
         }
      }
      console.log(gemResult)
      const fallbackType = inferFallbackType()
      const type = gemResult.type || fallbackType || 'general'
      const normalizedUserInput = gemResult.userInput || gemResult.userinput || gemResult.user_input || commandText
      const normalizedResponse = gemResult.response || (type === 'unsupported' ? 'sorry i unable to do it' : "Sorry, I couldn't understand that.")
      const normalizedQuery = gemResult.query || gemResult.searchQuery || (type === 'youtube-play' ? buildSearchQuery(commandText) : normalizedUserInput)
      const normalizedUrl = gemResult.url || gemResult.targetUrl || null
      const normalizedText = gemResult.text || gemResult.content || (type === 'open-new-tab' ? buildTabText(commandText) : null)
      const payload = {
         type,
         userInput: normalizedUserInput,
         response: normalizedResponse,
         originalCommand: command,
         query: normalizedQuery,
         url: normalizedUrl,
         text: normalizedText
      }

      switch(type){
         case 'get-date' :
            return res.json({
               ...payload,
               response:`current date is ${moment().format("YYYY-MM-DD")}`
            });
            case 'get-time':
                return res.json({
               ...payload,
               response:`current time is ${moment().format("hh:mm A")}`
            });
             case 'get-day':
                return res.json({
               ...payload,
               response:`today is ${moment().format("dddd")}`
            });
            case 'get-month':
                return res.json({
               ...payload,
               response:`today is ${moment().format("MMMM")}`
            });
         case 'unsupported':
            return res.json({
               ...payload,
               response: 'sorry i unable to do it'
            });
      default:
         return res.json(payload)
      }
     

   } catch (error) {
  return res.status(500).json({ response: "ask assistant error" })
   }
}

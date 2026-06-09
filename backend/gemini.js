import axios from "axios"

const groqResponse = async (command, assistantName, userName) => {
try {

    const apiUrl = process.env.GROQ_API_URL
    const apiKey = process.env.GROQ_API_KEY

    if(!apiUrl){
      throw new Error("GROQ_API_URL is not set")
    }

    if(!apiKey){
      throw new Error("GROQ_API_KEY is not set")
    }

    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant"
    const useResponseFormat = process.env.GROQ_USE_RESPONSE_FORMAT === "true"

    const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}. 
You are not Google. You will now behave like a voice-enabled assistant.

Your task is to understand the user's natural language input and respond with a JSON object like this:

{
  "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month" | "calculator-open" | "instagram-open" | "facebook-open" | "weather-show" | "open-url" | "open-new-tab" | "unsupported",
  "userInput": "<original user input>",
  "response": "<a short spoken response to read out loud to the user>",
  "query": "<search query if needed>",
  "url": "<full https:// URL if the command should open a website>",
  "text": "<text to write in a new tab if needed>"
}

Instructions:
- "type": determine the intent of the user.
- "userInput": original sentence the user spoke.
- "response": A short voice-friendly reply.
- "query": include the search phrase when a search is needed.
- "url": include a valid website URL when the user wants to open a site that is not one of the built-in apps.
- "text": include the exact text when the user asks to open a new tab and write something there.

Type meanings:
- "general": factual question
- "google-search": search on google
- "youtube-search": search youtube
- "youtube-play": play video
- "calculator-open": open calculator
- "instagram-open": open instagram
- "facebook-open": open facebook
- "weather-show": weather
- "get-time": current time
- "get-date": today's date
- "get-day": day
- "get-month": month
- "open-url": open any website by URL
- "open-new-tab": open a new tab and write the given text
- "unsupported": use when the assistant cannot perform the requested task directly

Important:
- Use ${userName} agar koi puche tume kisne banaya 
- If the user asks to open a website that is not listed above, return type "open-url" and include the exact URL in "url".
- If the user asks to open a new tab and write text, return type "open-new-tab" and include the exact text in "text".
- If the user asks for a task the assistant cannot do inside this app, return type "unsupported" and set response exactly to "sorry i unable to do it".
- If the user asks for a search, include the search phrase in "query".
- Only respond with JSON

now your userInput- ${command}
`;

let result

const payload = {
  model,
  messages: [
    {
      role: "user",
      content: prompt
    }
  ],
  temperature: 0.2
}

if (useResponseFormat) {
  payload.response_format = { type: "json_object" }
}

result = await axios.post(
  apiUrl,
  payload,
  {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    timeout: 20000
  }
)

const text = result?.data?.choices?.[0]?.message?.content

if(!text){
  throw new Error("Empty response from Groq")
}

return text

} catch (error) {
    const status = error?.response?.status
    const detail = error?.response?.data?.error?.message || error?.message || "unknown error"
    const statusTag = status ? ` (status ${status})` : ""
    console.log("groqResponse error:", error?.response?.data || detail)
    throw new Error(`${detail}${statusTag}`)
}
}

export default groqResponse

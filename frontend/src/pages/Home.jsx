import React, { useContext, useEffect, useRef, useState } from 'react'
import { userDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import aiImg from "../assets/ai.gif"
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";
import userImg from "../assets/user.gif"
function Home() {
  const {userData,serverUrl,setUserData,getGeminiResponse}=useContext(userDataContext)
  const navigate=useNavigate()
  const [listening,setListening]=useState(false)
  const [userText,setUserText]=useState("")
  const [aiText,setAiText]=useState("")
  const [typedText,setTypedText]=useState("")
  const [micBlocked,setMicBlocked]=useState(false)
  const isSpeakingRef=useRef(false)
  const recognitionRef=useRef(null)
  const [ham,setHam]=useState(false)
  const isRecognizingRef=useRef(false)
  const isStartingRef=useRef(false)
  const stopRequestedRef=useRef(false)
  const shouldListenRef=useRef(false)
  const restartTimerRef=useRef(null)
  const reservedTabRef=useRef(null)
  const abortCountRef=useRef(0)
  const lastAbortRef=useRef(0)
  const synth=window.speechSynthesis

  const scheduleRecognitionRestart = (delay = 500) => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
    }

    restartTimerRef.current = setTimeout(() => {
      if (
        shouldListenRef.current &&
        !isSpeakingRef.current &&
        !isRecognizingRef.current &&
        !isStartingRef.current &&
        !micBlocked
      ) {
        startRecognition()
      }
    }, delay)
  }

  const handleLogOut=async ()=>{
    try {
      const result=await axios.get(`${serverUrl}/api/auth/logout`,{withCredentials:true})
      setUserData(null)
      navigate("/signin")
    } catch (error) {
      setUserData(null)
      console.log(error)
    }
  }

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setMicBlocked(false)
      abortCountRef.current = 0
      startRecognition()
    } catch (e) {
      setMicBlocked(true)
      setAiText("Microphone permission is blocked. Please allow mic access.")
    }
  }

  const startRecognition = () => {
    if (!recognitionRef.current) return;
    if (!isSpeakingRef.current && !isRecognizingRef.current && !isStartingRef.current) {
      try {
        shouldListenRef.current = true;
        isStartingRef.current = true;
        recognitionRef.current.start();
        console.log("Recognition requested to start");
      } catch (error) {
        isStartingRef.current = false;
        if (error.name !== "InvalidStateError") {
          console.error("Start error:", error);
        }
      }
    }
  }

  const handleTypedSubmit = async () => {
    const text = typedText.trim()
    if (!text) return

    if (handleImmediateCommand(text)) {
      return
    }

    setAiText("")
    setUserText(text)
    const data = await getGeminiResponse(text)
    if (!data || !data.response) {
      const fallback = "Sorry, I couldn't get a response. Please try again."
      speak(fallback)
      setAiText(fallback)
      return
    }
    if (data.error) {
      const msg = `${data.response}`
      speak(msg)
      setAiText(msg)
      setTypedText("")
      setUserText("")
      return
    }
    handleCommand(data)
    setAiText(data.response)
    setTypedText("")
    setUserText("")
  }

  const speak=(text)=>{
    const utterence=new SpeechSynthesisUtterance(text)
    utterence.lang = 'hi-IN';
    const voices =window.speechSynthesis.getVoices()
    const hindiVoice = voices.find(v => v.lang === 'hi-IN');
    if (hindiVoice) {
      utterence.voice = hindiVoice;
    }


    isSpeakingRef.current=true
    utterence.onend=()=>{
      setAiText("");
      isSpeakingRef.current = false;
      stopRequestedRef.current = false;
      shouldListenRef.current = true;
      scheduleRecognitionRestart(700);
    }
    utterence.onerror=()=>{
      isSpeakingRef.current = false;
      stopRequestedRef.current = false;
      shouldListenRef.current = true;
      scheduleRecognitionRestart(700);
    }
   synth.cancel(); // 🛑 pehle se koi speech ho to band karo
synth.speak(utterence);
  }

  const normalizeExternalUrl = (value) => {
    if (!value || typeof value !== 'string') return null

    try {
      return new URL(value).toString()
    } catch {
      if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(value)) {
        try {
          return new URL(`https://${value}`).toString()
        } catch {
          return null
        }
      }

      return null
    }
  }

  const openExternalUrl = (value) => {
    const normalizedUrl = normalizeExternalUrl(value)
    if (!normalizedUrl) return false

    window.open(normalizedUrl, '_blank')
    return true
  }

  const escapeHtml = (value) => {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  const openTextInNewTab = (value) => {
    const text = (value || '').trim()
    const tab = reservedTabRef.current && !reservedTabRef.current.closed
      ? reservedTabRef.current
      : window.open('', '_blank')

    if (!tab) return false

    reservedTabRef.current = tab

    const safeText = text || 'No text provided.'
    tab.document.open()
    tab.document.write(`
      <html>
        <head>
          <title>Assistant Note</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              background: #f8fafc;
              color: #111827;
            }
            .card {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              padding: 32px;
              box-shadow: 0 18px 60px rgba(15, 23, 42, 0.12);
            }
            h1 {
              margin: 0 0 18px;
              font-size: 28px;
            }
            p {
              font-size: 20px;
              line-height: 1.6;
              white-space: pre-wrap;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Assistant Note</h1>
            <p>${escapeHtml(safeText)}</p>
          </div>
        </body>
      </html>
    `)
    tab.document.close()
    return true
  }

  const extractNoteText = (command) => {
    const text = (command || '').trim()
    if (!text) return null

    const normalized = text.toLowerCase()
    const notePatterns = [
      /(?:take|make|create|add|jot down)\s+(?:a\s+)?note\b/i,
      /\bnote that\b/i,
      /\bremember that\b/i,
      /\bjot down\b/i,
      /\bwrite\s+this\b/i,
    ]

    if (!notePatterns.some((pattern) => pattern.test(normalized))) {
      return null
    }

    const quotedText = text.match(/"([^"]+)"|'([^']+)'/)
    if (quotedText) {
      return (quotedText[1] || quotedText[2] || '').trim() || 'No text provided.'
    }

    const cleaned = text
      .replace(/\b(?:take|make|create|add|jot down|write|note|remember)\b/gi, ' ')
      .replace(/\b(?:a|an|the|please|this|that|it|for me|down|please|to|here|there)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return cleaned || 'No text provided.'
  }

  const handleImmediateCommand = (commandText) => {
    const noteText = extractNoteText(commandText)
    if (!noteText) return false

    const opened = openTextInNewTab(noteText)
    if (!opened) return false

    setAiText(`Noted: ${noteText}`)
    speak('Noted.')
    setUserText('')
    setTypedText('')
    return true
  }

  const handleCommand=(data)=>{
    const {type,userInput,response,originalCommand}=data
    speak(response);
    
    const commandForPath = (originalCommand || userInput || '').toLowerCase();
    const query = (data.query || userInput || '').trim()
    const commandHandlers = {
      'google-search': () => {
        const searchTerm = query || commandForPath
        window.open(`https://www.google.com/search?q=${encodeURIComponent(searchTerm)}`, '_blank')
        return true
      },
      'calculator-open': () => {
        window.open('https://www.google.com/search?q=calculator', '_blank')
        return true
      },
      'instagram-open': () => {
        window.open('https://www.instagram.com/', '_blank')
        return true
      },
      'facebook-open': () => {
        window.open('https://www.facebook.com/', '_blank')
        return true
      },
      'weather-show': () => {
        window.open('https://www.google.com/search?q=weather', '_blank')
        return true
      },
      'youtube-search': () => {
        const searchTerm = query || commandForPath
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`, '_blank')
        return true
      },
      'youtube-play': () => {
        const searchTerm = query || commandForPath
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`, '_blank')
        return true
      },
      'open-url': () => openExternalUrl(data.url || data.targetUrl || query),
      'open-website': () => openExternalUrl(data.url || data.targetUrl || query),
      'open-site': () => openExternalUrl(data.url || data.targetUrl || query),
      'open-new-tab': () => openTextInNewTab(data.text || data.content || query),
      'open-new-tab-text': () => openTextInNewTab(data.text || data.content || query),
      'unsupported': () => true,
    }

    const handled = commandHandlers[type]?.() || false
    if (handled) return

    if (data.url || data.targetUrl) {
      openExternalUrl(data.url || data.targetUrl)
      return
    }

    if (
      !['youtube-search', 'youtube-play'].includes(type) &&
      /\byoutube\b/.test(commandForPath) &&
      /\b(?:open|launch|go to|play)\b/.test(commandForPath)
    ) {
      window.open('https://www.youtube.com', '_blank');
      return
    }

    if (/\b(?:open|visit|go to|launch)\b/.test(commandForPath) && query) {
      openExternalUrl(query)
    }

  }

useEffect(() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setAiText("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
    setMicBlocked(true);
    return;
  }
  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.lang = 'en-US';
  recognition.interimResults = false;

  recognitionRef.current = recognition;

  let isMounted = true;  // flag to avoid setState on unmounted component

  recognition.onstart = () => {
    isRecognizingRef.current = true;
    isStartingRef.current = false;
    setListening(true);
    console.log("Recognition started");
  };

  recognition.onend = () => {
    isRecognizingRef.current = false;
    isStartingRef.current = false;
    setListening(false);
    stopRequestedRef.current = false;
    console.log("Recognition ended");
    if (shouldListenRef.current && !isSpeakingRef.current && !micBlocked) {
      scheduleRecognitionRestart(300);
    }
    return;
  };

  recognition.onerror = (event) => {
    if (event.error === "aborted") {
      isRecognizingRef.current = false;
      isStartingRef.current = false;
      setListening(false);
      stopRequestedRef.current = false;
      console.log("Recognition aborted");
      return;
    }
    console.warn("Recognition error:", event.error);
    isRecognizingRef.current = false;
    isStartingRef.current = false;
    setListening(false);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      const msg = "Microphone permission is blocked. Please allow mic access and reload.";
      setAiText(msg);
      speak(msg);
      setMicBlocked(true);
      shouldListenRef.current = false;
      return;
    }
    return;
  };

  recognition.onresult = async (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript.trim();
    console.log("Recognition result:", transcript);

    if (handleImmediateCommand(transcript)) {
      shouldListenRef.current = true;
      scheduleRecognitionRestart(500);
      recognition.stop();
      return;
    }

    setAiText("");
    setUserText(transcript);
    shouldListenRef.current = false;
    stopRequestedRef.current = true;
    recognition.stop();
    isRecognizingRef.current = false;
    setListening(false);

    const data = await getGeminiResponse(transcript);
    if (!data || !data.response) {
      const fallback = "Sorry, I couldn't get a response. Please try again.";
      speak(fallback);
      setAiText(fallback);
      setUserText("");
      return;
    }
    if (data.error) {
      const msg = `${data.response}`
      speak(msg);
      setAiText(msg);
      setUserText("");
      return;
    }
    handleCommand(data);
    setAiText(data.response);
    setUserText("");
  };


    const greetingName = userData?.name || "there";
    const greeting = new SpeechSynthesisUtterance(
      `Hello ${greetingName}, what can I help you with?`
    );
    greeting.lang = 'hi-IN';
   
    window.speechSynthesis.speak(greeting);


  return () => {
    isMounted = false;
    shouldListenRef.current = false;
    const restartTimer = restartTimerRef.current;
    if (restartTimer) clearTimeout(restartTimer);
    if (reservedTabRef.current && !reservedTabRef.current.closed) {
      reservedTabRef.current.close();
    }
    recognition.stop();
    setListening(false);
    isRecognizingRef.current = false;
  };
}, []);




  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden'>
      <CgMenuRight className='lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(true)}/>
      <div className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${ham?"translate-x-0":"translate-x-full"} transition-transform`}>
 <RxCross1 className=' text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]' onClick={()=>setHam(false)}/>
 <button className='min-w-[150px] h-[60px]  text-black font-semibold   bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px]  text-black font-semibold  bg-white  rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>

<div className='w-full h-[2px] bg-gray-400'></div>
<h1 className='text-white font-semibold text-[19px]'>History</h1>

<div className='w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate'>
  {userData.history?.map((his,idx)=>(
    <div key={`${his}-${idx}`} className='text-gray-200 text-[18px] w-full h-[30px]  '>{his}</div>
  ))}

</div>

      </div>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px]  bg-white rounded-full cursor-pointer text-[19px] ' onClick={handleLogOut}>Log Out</button>
      <button className='min-w-[150px] h-[60px] mt-[30px] text-black font-semibold  bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block ' onClick={()=>navigate("/customize")}>Customize your Assistant</button>
      <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>
<img src={userData?.assistantImage} alt="" className='h-full object-cover'/>
      </div>
      <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>
      {!aiText && <img src={userImg} alt="" className='w-[200px]'/>}
      {aiText && <img src={aiImg} alt="" className='w-[200px]'/>}
    
    <h1 className='text-white text-[18px] font-semibold text-wrap'>{userText?userText:aiText?aiText:null}</h1>
    {listening && <p className='text-green-300 text-[14px]'>Listening...</p>}
    {(!listening || micBlocked) && (
      <button
        className='min-w-[220px] h-[50px] mt-[10px] text-black font-semibold bg-white rounded-full text-[16px]'
        onClick={() => {
          requestMicPermission();
        }}
      >
        {micBlocked ? "Enable Microphone" : "Start Listening"}
      </button>
    )}
      
    </div>
  )
}

export default Home

import axios from 'axios'
import React, { createContext, useEffect, useState } from 'react'
export const userDataContext=createContext()
function UserContext({children}) {
  const serverUrl=import.meta.env.VITE_API_URL?.replace(/\/$/, "") || ""
    const [userData,setUserData]=useState(null)
    const [loading,setLoading]=useState(true)
    const [frontendImage,setFrontendImage]=useState(null)
     const [backendImage,setBackendImage]=useState(null)
     const [selectedImage,setSelectedImage]=useState(null)
    const handleCurrentUser=async ()=>{
        try {
            const result=await axios.get(`${serverUrl}/api/user/current`,{withCredentials:true})
            if(result.data && result.data._id){
                setUserData(result.data)
            } else {
                setUserData(null)
            }
        } catch (error) {
            // 401 = token invalid/missing → user logged out
            setUserData(null)
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

const getGeminiResponse=async (command)=>{
try {
  const result=await axios.post(
    `${serverUrl}/api/user/asktoassistant`,
    {command},
    {
      withCredentials:true,
      validateStatus: () => true
    }
  )
  if(result?.status >= 200 && result?.status < 300){
    setUserData((prev)=>prev ? {
      ...prev,
      history:[...(prev.history || []), command]
    } : prev)
    return result.data
  }
  return result?.data || {response:"assistant service unavailable", error:"bad_response"}
} catch (error) {
  console.log(error)
  return error?.response?.data || {response:"assistant service unavailable", error:"network_error"}
}
    }

    useEffect(()=>{
handleCurrentUser()
    },[])
    const value={
serverUrl,userData,setUserData,loading,backendImage,setBackendImage,frontendImage,setFrontendImage,selectedImage,setSelectedImage,getGeminiResponse
    }
  return (
    <div>
    <userDataContext.Provider value={value}>
      {children}
      </userDataContext.Provider>
    </div>
  )
}

export default UserContext

import {useState} from "react"
import api from "../api/client"

export default function CreateCampaign({onCreated,onBack}){
    const [name,setName]=useState("")
    const [template,setTemplate]=useState("")
    const [variables,setVariables]=useState([""])
    const [buttons,setButtons]=useState([{id:"",title:""}])
    const [file,setFile]=useState(null)
    const [loading,setLoading]=useState(false)

    const handleSubmit=async()=>{
        if(!file){
            alert("Please upload CSV first")
            return
        }

        if(!name || !template){
            alert("Fill all required fields")
            return
        }

        setLoading(true)

        try{
            const createRes=await api.post("/campaign/create/",{
                name,
                template_name:template,
                variables,
                buttons,
                // message_body:"-"
            })

            const campaignId=createRes.data.campaign_id

            const formData=new FormData()
            formData.append("file",file)
            formData.append("campaign_id",campaignId)

            await api.post("/contacts/upload/",formData,{
                headers:{
                    "Content-Type":"multipart/form-data"
                }
            })

            await api.post("/campaign/send/",{
                campaign_id:campaignId
            })

            onCreated({
                campaign_id:campaignId,
                name,
                total:0,
                sent:0,
                delivered:0,
                failed:0
            })

        }catch(err){
            console.error(err)
            alert("Something went wrong.")
        }finally{
            setLoading(false)
        }
    }

    return (
        <div style={styles.container}>

            {/* ✅ BACK BUTTON (same as analytics) */}
            <button style={styles.back} onClick={onBack}>
                ← Back
            </button>

            {/* ✅ TITLE BELOW */}
            <h2>Create Campaign</h2>

            {/* Upload */}
            <div style={styles.uploadSection}>
                <h4 style={{marginBottom:"10px"}}>Upload Contacts (CSV)</h4>

                <label style={styles.uploadBox}>
                    {file ? file.name : "Click to upload CSV"}
                    <input
                        type="file"
                        accept=".csv"
                        onChange={e=>setFile(e.target.files[0])}
                        style={{display:"none"}}
                    />
                </label>
            </div>

            {/* Form */}
            <div style={styles.card}>
                <input placeholder="Campaign Name" onChange={e=>setName(e.target.value)}/>
                <input placeholder="Template Name" onChange={e=>setTemplate(e.target.value)}/>

                <h4>Variables</h4>
                {variables.map((v,i)=>(
                    <input key={i}
                        placeholder={`Variable ${i+1}`}
                        onChange={e=>{
                            const copy=[...variables]
                            copy[i]=e.target.value
                            setVariables(copy)
                        }}
                    />
                ))}
                <button onClick={()=>setVariables([...variables,""])}>
                    + Add Variable
                </button>

                <h4>Buttons</h4>
                {buttons.map((b,i)=>(
                    <div key={i} style={styles.row}>
                        <input placeholder="ID"
                            onChange={e=>{
                                const copy=[...buttons]
                                copy[i].id=e.target.value
                                setButtons(copy)
                            }}
                        />
                        <input placeholder="Title"
                            onChange={e=>{
                                const copy=[...buttons]
                                copy[i].title=e.target.value
                                setButtons(copy)
                            }}
                        />
                    </div>
                ))}
                <button onClick={()=>setButtons([...buttons,{id:"",title:""}])}>
                    + Add Button
                </button>

                <button style={styles.primary} onClick={handleSubmit} disabled={loading}>
                    {loading ? "Processing..." : "Create & Send Campaign"}
                </button>
            </div>
        </div>
    )
}

const styles={
    container:{
        maxWidth:"700px",
        margin:"0 auto",
        display:"flex",
        flexDirection:"column",
        gap:"20px"
    },

    back:{
        background:"#334155",
        color:"white",
        padding:"8px 12px",
        borderRadius:"6px",
        width:"fit-content"
    },

    uploadSection:{
        display:"flex",
        flexDirection:"column"
    },

    uploadBox:{
        width:"94%",
        border:"2px dashed #334155",
        padding:"20px",
        borderRadius:"10px",
        textAlign:"center",
        cursor:"pointer",
        background:"#020617"
    },

    card:{
        background:"#1e293b",
        padding:"30px",
        borderRadius:"12px",
        display:"flex",
        flexDirection:"column",
        gap:"12px"
    },

    row:{
        display:"flex",
        gap:"10px"
    },

    primary:{
        marginTop:"10px",
        background:"#22c55e",
        color:"white",
        padding:"14px",
        fontWeight:"600",
        fontSize:"16px",
        borderRadius:"8px"
    }
}
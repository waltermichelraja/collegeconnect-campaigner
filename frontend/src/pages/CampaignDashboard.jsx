import {useEffect,useState} from "react"
import api from "../api/client"

export default function CampaignDashboard({onSelect,onCreate}){
    const [campaigns,setCampaigns]=useState([])
    const [loading,setLoading]=useState(true)

    useEffect(()=>{
        fetchCampaigns()
    },[])

    const fetchCampaigns=async()=>{
        try{
            const res=await api.get("/campaigns/")
            setCampaigns(res.data)
        }catch(err){
            console.error("Failed to fetch campaigns:",err)
        }finally{
            setLoading(false)
        }
    }

    return (
        <div>
            <div style={styles.header}>
                <h2>Campaigns</h2>
                <button style={styles.primary} onClick={onCreate}>
                    + New Campaign
                </button>
            </div>

            {/* Loading */}
            {loading && (
                <p style={{opacity:0.6}}>Loading campaigns...</p>
            )}

            {/* Empty */}
            {!loading && campaigns.length===0 && (
                <div style={styles.empty}>
                    <h3>No campaigns yet</h3>
                    <p style={{opacity:0.6}}>
                        Create your first campaign to get started
                    </p>
                </div>
            )}

            {/* Grid */}
            {!loading && campaigns.length>0 && (
                <div style={styles.grid}>
                    {campaigns.map(c=>(
                        <div
                            key={c.campaign_id}
                            style={styles.card}
                            onClick={()=>onSelect(c)}
                            onMouseEnter={(e)=>e.currentTarget.style.transform="translateY(-5px)"}
                            onMouseLeave={(e)=>e.currentTarget.style.transform="translateY(0px)"}
                        >
                            <h3>{c.name}</h3>

                            <p style={styles.status(c.status)}>
                                {c.status.toUpperCase()}
                            </p>

                            <div style={styles.stats}>
                                <span>Total: {c.total}</span>
                                <span>Sent: {c.sent}</span>
                                <span>Delivered: {c.delivered}</span>
                                <span>Failed: {c.failed}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

const styles={
    header:{
        display:"flex",
        justifyContent:"space-between",
        marginBottom:"20px"
    },
    empty:{
        marginTop:"60px",
        textAlign:"center"
    },
    grid:{
        display:"grid",
        gridTemplateColumns:"repeat(3,1fr)",
        gap:"20px"
    },
    card:{
        background:"#1e293b",
        padding:"20px",
        borderRadius:"12px",
        cursor:"pointer",
        transition:"all 0.2s ease",
        border:"1px solid #1e293b"
    },
    primary:{
        background:"#3b82f6",
        color:"white",
        padding:"10px 16px",
        borderRadius:"8px"
    },
    stats:{
        marginTop:"12px",
        display:"flex",
        flexWrap:"wrap",
        gap:"10px",
        fontSize:"12px",
        opacity:0.7
    },
    status:(status)=>({
        marginTop:"10px",
        fontWeight:"600",
        color:
            status==="completed"?"#10b981":
            status==="sending"?"#f59e0b":
            "#94a3b8"
    })
}
import {useEffect,useState} from "react"
import api from "../api/client"

export default function CampaignDashboard({onSelect,onCreate}){
    const [campaigns,setCampaigns]=useState([])
    const [filtered,setFiltered]=useState([])
    const [loading,setLoading]=useState(true)

    const [search,setSearch]=useState("")
    const [filter,setFilter]=useState("all")

    useEffect(()=>{
        fetchCampaigns()
    },[])

    useEffect(()=>{
        applyFilters()
    },[campaigns,search,filter])

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

    const applyFilters=()=>{
        let data=[...campaigns]

        if(filter!=="all"){
            data=data.filter(c=>c.status===filter)
        }

        if(search){
            data=data.filter(c=>
                c.name.toLowerCase().includes(search.toLowerCase())
            )
        }

        setFiltered(data)
    }

    return (
        <div>

            {/* HEADER */}
            <div style={styles.header}>
                <h2>Campaigns</h2>

                <div style={styles.actions}>
                    <input
                        placeholder="Search campaigns..."
                        value={search}
                        onChange={e=>setSearch(e.target.value)}
                        style={styles.search}
                    />

                    <select
                        value={filter}
                        onChange={e=>setFilter(e.target.value)}
                        style={styles.select}
                    >
                        <option value="all">All</option>
                        <option value="draft">Draft</option>
                        <option value="sending">Sending</option>
                        <option value="completed">Completed</option>
                    </select>

                    <button style={styles.primary} onClick={onCreate}>
                        + New Campaign
                    </button>
                </div>
            </div>

            {/* STATES */}
            {loading && <p style={{opacity:0.6}}>Loading campaigns...</p>}

            {!loading && filtered.length===0 && (
                <div style={styles.empty}>
                    <h3>No campaigns found</h3>
                    <p style={{opacity:0.6}}>
                        Try adjusting filters or create a new campaign
                    </p>
                </div>
            )}

            {/* GRID */}
            {!loading && filtered.length>0 && (
                <div style={styles.grid}>
                    {filtered.map(c=>(
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
        alignItems:"center",
        marginBottom:"20px"
    },

    actions:{
        display:"flex",
        gap:"10px",
        alignItems:"center"
    },

    search:{
        height:"38px",
        padding:"0 12px",
        borderRadius:"8px",
        border:"1px solid #334155",
        background:"#020617",
        color:"white",
        outline:"none"
    },

    select:{
        height:"38px",
        padding:"0 10px",
        borderRadius:"8px",
        background:"#020617",
        color:"white",
        border:"1px solid #334155",
        outline:"none"
    },

    primary:{
        height:"38px",
        background:"#3b82f6",
        color:"white",
        padding:"0 16px",
        borderRadius:"8px",
        display:"flex",
        alignItems:"center",
        justifyContent:"center",
        fontWeight:"500"
    },

    empty:{
        marginTop:"60px",
        textAlign:"center"
    },

    grid:{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",
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
            status==="completed"?"#22c55e":
            status==="sending"?"#f59e0b":
            "#94a3b8"
    })
}
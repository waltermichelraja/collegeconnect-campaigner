import {useEffect,useState} from "react"
import api from "../api/client"

export default function CampaignAnalytics({campaign,onBack}){
    const [stats,setStats]=useState({
        total:0,
        sent:0,
        delivered:0,
        failed:0
    })

    const [replies,setReplies]=useState([])
    const [meta,setMeta]=useState({
        page:1,
        page_size:10,
        total:0,
        total_pages:0
    })

    const [loading,setLoading]=useState(true)
    const [stopped,setStopped]=useState(campaign.status==="stopped"||campaign.status==="completed")
    const [stopping,setStopping]=useState(false)

    const [search,setSearch]=useState("")
    const [searching,setSearching]=useState(false)
    const [filterType,setFilterType]=useState("phone")

    useEffect(()=>{
        fetchData()
    },[meta.page])

    useEffect(()=>{
        if(search||stopped)return
        const interval=setInterval(()=>{
            fetchData({isPolling:true})
        },5000)
        return ()=>clearInterval(interval)
    },[search,stopped])

    const fetchData=async({isSearch=false,isPolling=false}={})=>{
        if(isSearch)setSearching(true)
        try{
            const progressRes=await api.get(`/progress/?campaign_id=${campaign.campaign_id}`)
            setStats(progressRes.data||{})
            if(!isPolling){
                const params={
                    campaign_id:campaign.campaign_id,
                    page:meta.page,
                    page_size:meta.page_size
                }
                if(search){
                    if(filterType==="phone") params.phone_number=search
                    if(filterType==="response") params.response=search
                }
                const repliesRes=await api.get(`/replies/`,{params})
                setReplies(repliesRes.data.results||[])
                setMeta(repliesRes.data.meta||{})
            }
        }catch(err){
            console.error(err)
        }finally{
            if(isSearch)setSearching(false)
            setLoading(false)
        }
    }

    const formatTime=(ts)=>{
        if(!ts)return "-"
        const d=new Date(ts)
        return d.toLocaleString()
    }

    const handleSearch=()=>{
        setSearching(true)
        setMeta(prev=>({...prev,page:1}))
        fetchData({isSearch:true})
    }

    const normalize=(val)=>(val||"unknown").toString().toLowerCase().trim()

    const colors=[
        "#ef4444","#22c55e","#3b82f6","#eab308",
        "#a855f7","#06b6d4","#f97316","#84cc16"
    ]
    const getColor=(label)=>{
        let hash=0
        for(let i=0;i<label.length;i++){
            hash=(hash<<5)-hash+label.charCodeAt(i)
            hash|=0
        }
        return colors[Math.abs(hash)%colors.length]
    }

    const getResponseStats=()=>{
        const counts={}

        replies.forEach(r=>{
            const key=normalize(r.response)
            counts[key]=(counts[key]||0)+1
        })

        const total=Object.values(counts).reduce((a,b)=>a+b,0)

        return Object.entries(counts)
            .map(([key,value])=>({
                label:key,
                count:value,
                percent:total?Math.round((value/total)*100):0
            }))
            .sort((a,b)=>b.count-a.count)
    }

    const responseStats=getResponseStats()
    const topResponse=responseStats[0]?.label||"-"

    const uniqueResponders=new Set(replies.map(r=>r.phone_number)).size
    const engagement=stats.total
        ?Math.min(100,Math.round((uniqueResponders/stats.total)*100)):0

    const handleStop=async()=>{
        if(stopped)return
        if(!window.confirm("are you sure you want to stop this campaign?"))return

        setStopping(true)

        try{
            await api.post("/campaign/stop/",{
                campaign_id:campaign.campaign_id
            })
            setStopped(true)
            campaign.status="stopped"
        }catch{
            alert("failed to stop campaign")
        }finally{
            setStopping(false)
        }
    }

    const handleExport=async()=>{
        try{
            const res=await api.get(`/export/?campaign_id=${campaign.campaign_id}`,{responseType:"blob"})
            const blob=new Blob([res.data],{type:"text/csv"})
            const url=window.URL.createObjectURL(blob)

            const link=document.createElement("a")
            link.href=url
            link.download=`campaign_${campaign.campaign_id}.csv`
            document.body.appendChild(link)
            link.click()
            link.remove()
        }catch{
            alert("export failed")
        }
    }

    return (
        <div style={styles.container}>

            <div style={styles.header}>
                <button style={styles.back} onClick={onBack}>← Back</button>

                <div style={styles.actions}>
                    <button
                        style={{
                            ...styles.stop,
                            ...(stopped?styles.stopDisabled:{}),
                            cursor:stopped?"not-allowed":"pointer"
                        }}
                        onClick={handleStop}
                        disabled={stopped||stopping}
                    >
                        {stopped?"Campaign Ended":(stopping?"Stopping...":"End Campaign")}
                    </button>

                    <button style={styles.export} onClick={handleExport}>
                        ⬇ Export CSV
                    </button>
                </div>
            </div>

            <div style={styles.grid}>
                <Stat label="Total" value={stats.total||0}/>
                <Stat label="Sent" value={stats.sent||0}/>
                <Stat label="Delivered" value={stats.delivered||0}/>
                <Stat label="Failed" value={stats.failed||0}/>
            </div>

            <div style={styles.insightGrid}>
                <Insight label="Top Response" value={topResponse}/>
                <Insight label="Engagement" value={`${engagement}%`}/>
                <Insight label="Total Replies" value={meta.total}/>
            </div>

            <div style={styles.card}>
                <h3>Response Breakdown</h3>

                {responseStats.map((r,i)=>(
                    <div key={i} style={styles.breakItem}>
                        <span style={styles.label}>{r.label}</span>

                        <div style={styles.barContainer}>
                            <div style={{...styles.bar,width:`${r.percent}%`,background:getColor(r.label)}}/>
                        </div>

                        <span style={styles.percent}>{r.percent}% ({r.count})</span>
                    </div>
                ))}
            </div>

            <div style={styles.card}>
                <div style={styles.filterRow}>
                    <input
                        placeholder="search..."
                        value={search}
                        onChange={e=>setSearch(e.target.value)}
                        onKeyDown={e=>{
                            if(e.key==="Enter"){
                                handleSearch()
                            }
                        }}
                    />

                    <select
                        style={styles.select}
                        value={filterType}
                        onChange={e=>setFilterType(e.target.value)}
                    >
                        <option value="phone">phone_number</option>
                        <option value="response">response</option>
                    </select>

                    <button style={styles.searchBtn} onClick={handleSearch}>
                        {searching?"searching...":"search"}
                    </button>
                </div>
                <h3>Responses</h3>
                {replies.map((r,i)=>(
                    <div key={i} style={styles.replyItem}>
                        <div style={styles.replyLeft}>
                            <span>{r.phone_number}</span>
                            <span style={styles.timestamp}>
                                {formatTime(r.timestamp)}
                            </span>
                        </div>

                        <span
                            style={{
                                ...styles.badge,
                                background:getColor(normalize(r.response))
                            }}
                        >
                            {normalize(r.response)}
                        </span>
                    </div>
                ))}
            </div>

            <div style={styles.pagination}>
                <button disabled={meta.page===1} onClick={()=>setMeta(p=>({...p,page:p.page-1}))}>prev</button>
                <span>page {meta.page} / {meta.total_pages||1}</span>
                <button disabled={meta.page===meta.total_pages} onClick={()=>setMeta(p=>({...p,page:p.page+1}))}>next</button>
            </div>
        </div>
    )
}

function Stat({label,value}){
    return <div style={styles.stat}><p style={{opacity:0.6}}>{label}</p><h1>{value}</h1></div>
}

function Insight({label,value}){
    return <div style={styles.insight}><p style={{opacity:0.6,fontSize:"12px"}}>{label}</p><h3>{value}</h3></div>
}

const styles={
    container:{maxWidth:"900px",margin:"0 auto"},
    header:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},
    actions:{display:"flex",gap:"10px"},
    back:{background:"#334155",color:"white",padding:"8px 12px",borderRadius:"6px"},
    stop:{background:"#ef4444",color:"white",padding:"8px 14px",borderRadius:"6px"},
    stopDisabled:{background:"#475569"},
    export:{background:"#7c3aed",color:"white",padding:"8px 14px",borderRadius:"6px"},

    grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"20px",marginTop:"20px"},
    insightGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"20px",marginTop:"20px"},

    stat:{background:"#1e293b",padding:"20px",borderRadius:"12px",textAlign:"center"},
    insight:{background:"#020617",padding:"15px",borderRadius:"10px"},

    card:{marginTop:"30px",background:"#1e293b",padding:"20px",borderRadius:"12px"},

    breakItem:{display:"flex",alignItems:"center",gap:"10px",marginTop:"10px"},
    label:{width:"120px"},
    barContainer:{flex:1,height:"8px",background:"#020617",borderRadius:"5px"},
    bar:{height:"100%",borderRadius:"5px"},
    percent:{width:"90px",textAlign:"right",fontSize:"12px"},

    filterRow:{display:"flex",gap:"10px",marginBottom:"15px"},

    select:{
        background:"#020617",
        color:"white",
        border:"1px solid #334155",
        borderRadius:"8px",
        padding:"10px"
    },

    searchBtn:{
        background:"#3b82f6",
        color:"white",
        borderRadius:"8px",
        padding:"10px 16px"
    },

    replyItem:{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#020617",padding:"10px 14px",borderRadius:"8px",marginTop:"8px"},

    badge:{minWidth:"90px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"6px",fontSize:"12px",color:"white",textTransform:"capitalize"},

    replyLeft:{display:"flex",flexDirection:"column",gap:"2px"},
    timestamp:{fontSize:"11px",opacity:0.5},

    pagination:{marginTop:"20px",display:"flex",justifyContent:"center",gap:"20px"}
}
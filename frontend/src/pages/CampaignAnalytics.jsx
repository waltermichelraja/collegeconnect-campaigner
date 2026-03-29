import { useEffect, useState, useRef } from "react"
import api from "../api/client"

const COLOR_POOL=[
    "var(--green)",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#eab308"
]

function MetricCard({ label, value, sub, accent }) {
    return (
        <div style={styles.metricCard}>
            <div style={styles.metricLabel}>{label}</div>
            <div style={{ ...styles.metricValue, ...(accent ? { color: accent } : {}) }}>
                {value}
            </div>
            {sub && <div style={styles.metricSub}>{sub}</div>}
        </div>
    )
}

const getResponseColor=(key)=>{
    const str=(key||"unknown").toString()
    let hash=0

    for(let i=0;i<str.length;i++){
        hash=str.charCodeAt(i)+((hash<<5)-hash)
    }

    const index=Math.abs(hash)%COLOR_POOL.length
    return COLOR_POOL[index]
}

function DonutChart({ data }) {
    const entries = Object.entries(data)
    const total = entries.reduce((sum,[,v])=>sum+v,0)
    if(total===0)return null

    const size=120
    const r=46
    const cx=size/2
    const cy=size/2
    const circ=2*Math.PI*r

    let offset=0

    return(
        <div style={styles.donutWrap}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={cx} cy={cy} r={r} fill="none"
                    stroke="var(--bg-elevated)" strokeWidth="14"/>

                {entries.map(([key,value],i)=>{
                    const pct=value/total
                    const dash=pct*circ

                    const circle=(
                        <circle key={key}
                            cx={cx} cy={cy} r={r} fill="none"
                            stroke={getResponseColor(key)} strokeWidth="14"
                            strokeDasharray={`${dash} ${circ}`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 ${cx} ${cy})`}
                        />
                    )

                    offset+=dash
                    return circle
                })}

                <text x={cx} y={cy} textAnchor="middle"
                    style={{fontSize:"14px",fontWeight:"700",fill:"var(--text-primary)"}}>
                    {total}
                </text>
            </svg>

            <div style={styles.donutLegend}>
                {entries.map(([key,value],i)=>(
                    <div key={key} style={styles.legendItem}>
                        <span style={{
                            ...styles.legendDot,
                            background:getResponseColor(key)
                        }}/>
                        <span style={styles.legendLabel}>
                            {key}
                        </span>
                        <span style={styles.legendVal}>
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function ReplyBadge({ value }) {
    const color=getResponseColor(value)
    const bg = color.startsWith("#")? color+"22" : "rgba(148,163,184,0.15)"
    const label=value?value.charAt(0).toUpperCase()+value.slice(1):"Unknown"

    return (
        <span style={{
            display:"inline-flex",
            alignItems:"center",
            padding:"3px 10px",
            borderRadius:"20px",
            fontSize:"12px",
            fontWeight:"600",
            background:bg,
            color:color,
        }}>
            {label}
        </span>
    )
}

function RepliesTable({ replies, loading }) {
    const [search, setSearch] = useState("")
    const filtered = Array.isArray(replies) ? replies.filter(r => (r.phone_number||"").includes(search)) : []

    if (loading) {
        return (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1,2,3].map(i => (
                    <div key={i} className="skeleton" style={{ height: "44px", borderRadius: "8px" }} />
                ))}
            </div>
        )
    }

    if (replies.length === 0) {
        return <div style={styles.tableEmpty}>No responses yet</div>
    }

    return (
        <div>
            <div style={styles.tableToolbar}>
                <div style={styles.searchWrap}>
                    <svg style={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input
                        style={styles.searchInput}
                        placeholder="Search by phone number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <span style={styles.replyCount}>
                    {filtered.length} response{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            <div style={styles.tableWrap}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>#</th>
                            <th style={styles.th}>Phone number</th>
                            <th style={styles.th}>Response</th>
                            <th style={{ ...styles.th, textAlign: "right" }}>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r, i) => (
                            <tr key={r.phone_number + i}
                                style={{
                                    ...styles.tr,
                                    ...(i === filtered.length - 1 ? { borderBottom: "none" } : {})
                                }}
                            >
                                <td style={{ ...styles.td, color: "var(--text-muted)", width: "48px" }}>
                                    {i + 1}
                                </td>
                                <td style={styles.td}>
                                    <span style={styles.phone}>{r.phone_number}</span>
                                </td>
                                <td style={styles.td}>
                                    <ReplyBadge value={r.response} />
                                </td>
                                <td style={{ ...styles.td, textAlign: "right", color: "var(--text-muted)", fontSize: "12px" }}>
                                    {new Date(r.timestamp).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default function CampaignAnalytics({ campaign: initialCampaign, onBack, toast }) {
    const [progress, setProgress] = useState({
        total:     initialCampaign.total     || 0,
        sent:      initialCampaign.sent      || 0,
        delivered: initialCampaign.delivered || 0,
        failed:    initialCampaign.failed    || 0,
        pending:   0,
    })
    const [status, setStatus]               = useState(initialCampaign.status)
    const [replies, setReplies]             = useState([])
    const [repliesLoading, setRepliesLoading] = useState(true)
    const [exporting, setExporting]         = useState(false)
    const intervalRef                       = useRef(null)

    const isSending   = status === "sending"
    const { total, sent, delivered, failed, pending } = progress
    const progressPct = total > 0 ? Math.round((delivered / total) * 100) : 0
    const delivRate   = total > 0 ? Math.round((delivered / total) * 100) : 0

    const fetchProgress = async () => {
        try {
            const res = await api.get("/progress/", {
                params: { campaign_id: initialCampaign.campaign_id }
            })
            setProgress(res.data)
            if (res.data.pending === 0 && res.data.sent > 0 && res.data.sent >= res.data.total) {
                setStatus("completed")
            }
        } catch (err) {
            console.error("Failed to fetch progress:", err)
        }
    }

    const fetchReplies = async () => {
        try {
            const res = await api.get("/replies/", {
                params:{campaign_id:initialCampaign.campaign_id}
            })
            const data = Array.isArray(res.data)
                ? res.data
                : res.data.results || []

            setReplies(data)
        } catch(err){
            console.error("Failed to fetch replies:",err)
            setReplies([])
        } finally {
            setRepliesLoading(false)
        }
    }

    useEffect(() => {
        fetchProgress()
        fetchReplies()

        if (isSending) {
            intervalRef.current = setInterval(() => {
                fetchProgress()
                fetchReplies()
            }, 5000)
        }

        return () => clearInterval(intervalRef.current)
    }, [initialCampaign.campaign_id])

    useEffect(() => {
        if (!isSending) clearInterval(intervalRef.current)
    }, [isSending])

    const handleExport = async () => {
        setExporting(true)
        try {
            const res = await api.get("/export/", {
                params: { campaign_id: initialCampaign.campaign_id },
                responseType: "blob",
            })
            const url  = window.URL.createObjectURL(new Blob([res.data]))
            const link = document.createElement("a")
            link.href  = url
            link.setAttribute("download", `${initialCampaign.name}_replies.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            toast?.("Exported successfully", "success")
        } catch (err) {
            toast?.("Export failed", "error")
        } finally {
            setExporting(false)
        }
    }

    const progressColor =
        status === "completed" ? "green" :
        status === "sending"   ? "amber" :
        status === "stopped"   ? "red"   : "slate"

    const badgeClass = `badge badge-${status}`
    const responseCounts = replies.reduce((acc,r)=>{
        const key = (r.response || "unknown").toString().trim().toLowerCase()
        acc[key] = (acc[key]||0)+1
        return acc
    },{})

    return (
        <div style={styles.container}>

            {/* Header */}
            <div style={styles.header}>
                <button className="btn-ghost btn-sm" onClick={onBack}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back
                </button>

                <div style={styles.headerCenter}>
                    <div style={styles.titleRow}>
                        <h2 style={{ margin: 0 }}>{initialCampaign.name}</h2>
                        <span className={badgeClass}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                        {isSending && (
                            <span style={styles.liveChip}>
                                <span style={styles.liveDot} />
                                Live
                            </span>
                        )}
                    </div>
                    <p style={styles.subtitle}>
                        Campaign ID: <code style={styles.code}>{initialCampaign.campaign_id}</code>
                    </p>
                </div>

                <button
                    className="btn-ghost btn-sm"
                    onClick={handleExport}
                    disabled={exporting || replies.length === 0}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {exporting ? "Exporting..." : "Export CSV"}
                </button>
            </div>

            {/* Progress bar */}
            <div style={styles.progressSection}>
                <div style={styles.progressHeader}>
                    <span style={styles.progressLabel}>
                        {delivered.toLocaleString()} / {total.toLocaleString()} delivered
                    </span>
                    <span style={styles.progressPct}>{progressPct}%</span>
                </div>
                <div className="progress-bar" style={{ height: "8px" }}>
                    <div
                        className={`progress-fill ${progressColor}`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Metrics */}
            <div style={styles.metricsGrid}>
                <MetricCard label="Total contacts" value={total.toLocaleString()} />
                <MetricCard label="Messages sent"  value={sent.toLocaleString()} />
                <MetricCard
                    label="Delivered"
                    value={delivered.toLocaleString()}
                    sub={`${delivRate}% delivery rate`}
                    accent="var(--green)"
                />
                <MetricCard
                    label="Failed"
                    value={failed.toLocaleString()}
                    sub={total > 0 ? `${Math.round((failed / total) * 100)}% of total` : "—"}
                    accent={failed > 0 ? "var(--red)" : undefined}
                />
            </div>

            {/* Response breakdown */}
            {total > 0 && (
                <div className="card" style={styles.sectionCard}>
                    <h4 style={styles.sectionTitle}>Response breakdown</h4>
                    <DonutChart data={responseCounts} />
                </div>
            )}

            {/* Responses table */}
            <div className="card" style={styles.sectionCard}>
                <div style={styles.repliesHeader}>
                    <div>
                        <h4 style={styles.sectionTitle}>Responses</h4>
                        {replies.length > 0 && (
                            <p style={styles.repliesSub}>
                                {Object.entries(responseCounts).sort((a,b)=>b[1]-a[1]).map(([key,count],i)=>(
                                    <span key={key}>
                                        <span style={{fontWeight:"600"}}>
                                            {count} {key}
                                        </span>
                                        {i<Object.keys(responseCounts).length-1?" · ":""}
                                    </span>
                                ))}
                                {" · "}
                                {replies.length} total
                            </p>
                        )}
                    </div>
                </div>
                <RepliesTable replies={replies} loading={repliesLoading} />
            </div>

            {/* Live note */}
            {isSending && (
                <p style={styles.refreshNote}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                    </svg>
                    Progress and responses refresh every 5 seconds
                </p>
            )}
        </div>
    )
}

const styles = {
    container: {
        maxWidth: "860px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
    },
    header: {
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
    },
    headerCenter: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    titleRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        flexWrap: "wrap",
    },
    subtitle: {
        fontSize: "12px",
        color: "var(--text-muted)",
    },
    code: {
        fontFamily: "monospace",
        fontSize: "11px",
        background: "var(--bg-elevated)",
        padding: "1px 6px",
        borderRadius: "4px",
        color: "var(--text-secondary)",
    },
    liveChip: {
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "500",
        background: "var(--amber-dim)",
        color: "var(--amber-text)",
    },
    liveDot: {
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: "var(--amber)",
        animation: "pulse 1.4s ease-in-out infinite",
    },
    progressSection: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    progressHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    progressLabel: {
        fontSize: "13px",
        color: "var(--text-secondary)",
    },
    progressPct: {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--text-primary)",
    },
    metricsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
    },
    metricCard: {
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
    },
    metricLabel: {
        fontSize: "12px",
        color: "var(--text-muted)",
        marginBottom: "6px",
    },
    metricValue: {
        fontSize: "24px",
        fontWeight: "700",
        color: "var(--text-primary)",
        lineHeight: "1",
    },
    metricSub: {
        fontSize: "11px",
        color: "var(--text-muted)",
        marginTop: "5px",
    },
    sectionCard: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    sectionTitle: {
        fontSize: "14px",
        fontWeight: "600",
        marginBottom: "2px",
    },
    repliesHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    repliesSub: {
        fontSize: "12px",
        color: "var(--text-muted)",
        marginTop: "2px",
    },
    tableToolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
        gap: "12px",
    },
    searchWrap: {
        position: "relative",
        width: "240px",
    },
    searchIcon: {
        position: "absolute",
        left: "10px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--text-muted)",
        pointerEvents: "none",
    },
    searchInput: {
        height: "34px",
        fontSize: "13px",
        padding: "0 10px 0 32px",
    },
    replyCount: {
        fontSize: "12px",
        color: "var(--text-muted)",
        flexShrink: 0,
    },
    tableWrap: {
        overflowX: "auto",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "13px",
    },
    th: {
        padding: "10px 14px",
        textAlign: "left",
        fontSize: "11px",
        fontWeight: "600",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        background: "var(--bg-elevated)",
        borderBottom: "1px solid var(--border)",
        whiteSpace: "nowrap",
    },
    tr: {
        borderBottom: "1px solid var(--border)",
    },
    td: {
        padding: "11px 14px",
        color: "var(--text-primary)",
        verticalAlign: "middle",
    },
    phone: {
        fontFamily: "monospace",
        fontSize: "13px",
        color: "var(--text-primary)",
    },
    tableEmpty: {
        padding: "32px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "13px",
    },
    donutWrap: {
        display: "flex",
        alignItems: "center",
        gap: "32px",
    },
    donutLegend: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
    },
    legendItem: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    legendDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        flexShrink: 0,
    },
    legendLabel: {
        fontSize: "13px",
        color: "var(--text-secondary)",
        flex: 1,
        minWidth: "80px",
    },
    legendVal: {
        fontSize: "13px",
        fontWeight: "600",
        color: "var(--text-primary)",
    },
    refreshNote: {
        fontSize: "12px",
        color: "var(--text-muted)",
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
}
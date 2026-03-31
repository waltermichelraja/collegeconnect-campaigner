import { useEffect, useState } from "react"
import api from "../api/client"

const STATUS_ORDER = ["all", "sending", "completed", "draft", "stopped"]

function StatCard({ label, value, sub, subColor }) {
    return (
        <div style={styles.statCard}>
            <div style={styles.statLabel}>{label}</div>
            <div style={styles.statValue}>{value}</div>
            {sub && (
                <div style={{ ...styles.statSub, color: subColor || "var(--text-muted)" }}>
                    {sub}
                </div>
            )}
        </div>
    )
}

function CampaignCard({ campaign, onClick }) {
    const [hovered, setHovered] = useState(false)
    const { name, status, total, sent, delivered, failed } = campaign
    const progress = total > 0 ? Math.round((sent / total) * 100) : 0

    const progressColor =
        status === "completed" ? "green" :
        status === "sending"   ? "amber" :
        status === "stopped"   ? "red"   : "slate"

    const badgeClass = `badge badge-${status}`

    return (
        <div
            style={{
                ...styles.card,
                ...(hovered ? styles.cardHovered : {}),
                ...(status === "sending" ? styles.cardSending : {})
            }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={styles.cardHeader}>
                <h3 style={styles.cardName}>{name}</h3>
                <span className={badgeClass}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            </div>

            {total > 0 && (
                <>
                    <div style={styles.progressWrap}>
                        <div className="progress-bar">
                            <div
                                className={`progress-fill ${progressColor}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span style={styles.progressLabel}>{progress}%</span>
                    </div>

                    <div style={styles.cardStats}>
                        <div style={styles.stat}>
                            <span style={styles.statNum}>{sent.toLocaleString()}</span>
                            <span style={styles.statKey}>Sent</span>
                        </div>
                        <div style={styles.statDivider} />
                        <div style={styles.stat}>
                            <span style={styles.statNum}>{delivered.toLocaleString()}</span>
                            <span style={styles.statKey}>Delivered</span>
                        </div>
                        <div style={styles.statDivider} />
                        <div style={styles.stat}>
                            <span style={{ ...styles.statNum, color: failed > 0 ? "var(--red)" : "var(--text-secondary)" }}>
                                {failed.toLocaleString()}
                            </span>
                            <span style={styles.statKey}>Failed</span>
                        </div>
                        <div style={styles.statDivider} />
                        <div style={styles.stat}>
                            <span style={styles.statNum}>{total.toLocaleString()}</span>
                            <span style={styles.statKey}>Total</span>
                        </div>
                    </div>
                </>
            )}

            {total === 0 && (
                <p style={styles.emptyNote}>No contacts uploaded yet</p>
            )}
        </div>
    )
}

function SkeletonCard() {
    return (
        <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <div className="skeleton" style={{ width: "55%", height: "18px", borderRadius: "6px" }} />
                <div className="skeleton" style={{ width: "20%", height: "18px", borderRadius: "20px" }} />
            </div>
            <div className="skeleton" style={{ width: "100%", height: "4px", borderRadius: "2px", marginBottom: "14px" }} />
            <div style={{ display: "flex", gap: "12px" }}>
                {[1,2,3,4].map(i => (
                    <div key={i} className="skeleton" style={{ width: "20%", height: "32px", borderRadius: "6px" }} />
                ))}
            </div>
        </div>
    )
}

export default function CampaignDashboard({ onSelect, onCreate, toast }) {
    const [campaigns, setCampaigns] = useState([])
    const [filtered, setFiltered]   = useState([])
    const [loading, setLoading]     = useState(true)
    const [search, setSearch]       = useState("")
    const [filter, setFilter]       = useState("all")

    useEffect(() => { fetchCampaigns() }, [])
    useEffect(() => { applyFilters() }, [campaigns, search, filter])

    const fetchCampaigns = async () => {
        try {
            const res = await api.get("/campaigns/")
            setCampaigns(res.data)
        } catch (err) {
            console.error("failed to fetch campaigns:", err)
            toast?.("Failed to load campaigns", "error")
        } finally {
            setLoading(false)
        }
    }

    const applyFilters = () => {
        let data = [...campaigns]
        if (filter !== "all") data = data.filter(c => c.status === filter)
        if (search) data = data.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase())
        )
        setFiltered(data)
    }

    // summary stats
    const totalSent      = campaigns.reduce((s, c) => s + (c.sent || 0), 0)
    const totalDelivered = campaigns.reduce((s, c) => s + (c.delivered || 0), 0)
    const activeSending  = campaigns.filter(c => c.status === "sending").length
    const totalContacts = campaigns.reduce((s, c) => s + (c.total || 0), 0)
    const deliveryRate = totalContacts > 0 ? Math.round((totalDelivered / totalContacts) * 100) : 0

    return (
        <div>
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h2>Campaigns</h2>
                    <p style={styles.subtitle}>
                        {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} total
                    </p>
                </div>
                <button className="btn-primary" onClick={onCreate}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                    New Campaign
                </button>
            </div>

            {/* Stats */}
            {!loading && campaigns.length > 0 && (
                <div style={styles.statsRow}>
                    <StatCard label="Total campaigns" value={campaigns.length} />
                    <StatCard
                        label="Messages sent"
                        value={totalSent.toLocaleString()}
                    />
                    <StatCard
                        label="Delivery rate"
                        value={`${deliveryRate}%`}
                        sub={totalDelivered.toLocaleString() + " delivered"}
                    />
                    <StatCard
                        label="Active now"
                        value={activeSending}
                        sub={activeSending > 0 ? "Sending" : "None sending"}
                        subColor={activeSending > 0 ? "var(--amber)" : undefined}
                    />
                </div>
            )}

            {/* Filters */}
            <div style={styles.toolbar}>
                <div style={styles.searchWrap}>
                    <svg style={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input
                        style={styles.searchInput}
                        placeholder="Search campaigns..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <div style={styles.filters}>
                    {STATUS_ORDER.map(s => (
                        <button
                            key={s}
                            style={{
                                ...styles.filterBtn,
                                ...(filter === s ? styles.filterBtnActive : {})
                            }}
                            onClick={() => setFilter(s)}
                        >
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading skeletons */}
            {loading && (
                <div style={styles.grid}>
                    {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
                </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                            stroke="#475569" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M3 3h18v18H3zM3 9h18M9 21V9"/>
                        </svg>
                    </div>
                    <h3>No campaigns found</h3>
                    <p>
                        {search || filter !== "all"
                            ? "Try adjusting your search or filter"
                            : "Create your first campaign to get started"}
                    </p>
                    {!search && filter === "all" && (
                        <button className="btn-primary" style={{ marginTop: "8px" }} onClick={onCreate}>
                            New Campaign
                        </button>
                    )}
                </div>
            )}

            {/* Grid */}
            {!loading && filtered.length > 0 && (
                <div style={styles.grid}>
                    {filtered.map(c => (
                        <CampaignCard
                            key={c.campaign_id}
                            campaign={c}
                            onClick={() => onSelect(c)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

const styles = {
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "24px",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--text-muted)",
        marginTop: "2px",
    },
    statsRow: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
        marginBottom: "24px",
    },
    statCard: {
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "14px 16px",
    },
    statLabel: {
        fontSize: "12px",
        color: "var(--text-muted)",
        marginBottom: "6px",
    },
    statValue: {
        fontSize: "22px",
        fontWeight: "600",
        color: "var(--text-primary)",
        lineHeight: "1",
    },
    statSub: {
        fontSize: "12px",
        marginTop: "4px",
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "20px",
        gap: "12px",
    },
    searchWrap: {
        position: "relative",
        width: "260px",
    },
    searchIcon: {
        position: "absolute",
        left: "12px",
        top: "50%",
        transform: "translateY(-50%)",
        color: "var(--text-muted)",
        pointerEvents: "none",
    },
    searchInput: {
        width: "100%",
        paddingLeft: "36px",
        height: "38px",
        padding: "0 12px 0 36px",
    },
    filters: {
        display: "flex",
        gap: "6px",
    },
    filterBtn: {
        padding: "6px 14px",
        fontSize: "13px",
        fontWeight: "500",
        background: "transparent",
        border: "1px solid var(--border-mid)",
        color: "var(--text-muted)",
        borderRadius: "20px",
        cursor: "pointer",
        transition: "all 0.15s ease",
    },
    filterBtnActive: {
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        borderColor: "var(--border-focus)",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "16px",
    },
    card: {
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "18px 20px",
        cursor: "pointer",
        transition: "all 0.15s ease",
    },
    cardHovered: {
        borderColor: "var(--border-mid)",
        transform: "translateY(-2px)",
    },
    cardSending: {
        borderColor: "#854f0b44",
    },
    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: "14px",
        gap: "10px",
    },
    cardName: {
        fontSize: "14px",
        fontWeight: "600",
        color: "var(--text-primary)",
        lineHeight: "1.3",
    },
    progressWrap: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "14px",
    },
    progressLabel: {
        fontSize: "11px",
        color: "var(--text-muted)",
        flexShrink: 0,
    },
    cardStats: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
    },
    stat: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        flex: 1,
    },
    statNum: {
        fontSize: "15px",
        fontWeight: "600",
        color: "var(--text-primary)",
        lineHeight: "1",
    },
    statKey: {
        fontSize: "11px",
        color: "var(--text-muted)",
    },
    statDivider: {
        width: "1px",
        height: "28px",
        background: "var(--border)",
        flexShrink: 0,
    },
    emptyNote: {
        fontSize: "13px",
        color: "var(--text-muted)",
        marginTop: "4px",
    },
}
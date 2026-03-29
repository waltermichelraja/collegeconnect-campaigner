import { useState } from "react"
import api from "../api/client"

const STEPS = ["Upload contacts", "Configure", "Review & send"]

function StepIndicator({ current }) {
    return (
        <div style={styles.steps}>
            {STEPS.map((label, i) => {
                const done    = i < current
                const active  = i === current
                return (
                    <div key={i} style={styles.stepItem}>
                        <div style={{
                            ...styles.stepCircle,
                            ...(done   ? styles.stepDone   : {}),
                            ...(active ? styles.stepActive : {}),
                        }}>
                            {done ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                                    stroke="white" strokeWidth="3" strokeLinecap="round">
                                    <path d="M20 6L9 17l-5-5"/>
                                </svg>
                            ) : (
                                <span>{i + 1}</span>
                            )}
                        </div>
                        <span style={{
                            ...styles.stepLabel,
                            ...(active ? styles.stepLabelActive : {}),
                        }}>
                            {label}
                        </span>
                        {i < STEPS.length - 1 && (
                            <div style={{
                                ...styles.stepLine,
                                ...(done ? styles.stepLineDone : {}),
                            }} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function FieldError({ msg }) {
    if (!msg) return null
    return <p style={styles.fieldError}>{msg}</p>
}

export default function CreateCampaign({ onCreated, onBack, toast }) {
    const [step, setStep]           = useState(0)
    const [name, setName]           = useState("")
    const [template, setTemplate]   = useState("")
    const [variables, setVariables] = useState([""])
    const [buttons, setButtons]     = useState([{ id: "", title: "" }])
    const [file, setFile]           = useState(null)
    const [loading, setLoading]     = useState(false)
    const [errors, setErrors]       = useState({})
    const [dragging, setDragging]   = useState(false)

    const validate = (stepIndex) => {
        const e = {}
        if (stepIndex === 0 && !file) e.file = "Please upload a CSV file"
        if (stepIndex === 1) {
            if (!name.trim()) e.name = "Campaign name is required"
            if (!template.trim()) e.template = "Template name is required"
        }
        setErrors(e)
        return Object.keys(e).length === 0
    }

    const nextStep = () => {
        if (validate(step)) setStep(s => s + 1)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        const dropped = e.dataTransfer.files[0]
        if (dropped?.name.endsWith(".csv")) {
            setFile(dropped)
            setErrors(prev => ({ ...prev, file: null }))
        } else {
            toast?.("Only CSV files are accepted", "error")
        }
    }

    const handleSubmit = async () => {
        if (!validate(1)) return
        setLoading(true)

        try {
            const createRes = await api.post("/campaign/create/", {
                name,
                template_name: template,
                variables,
                buttons,
            })

            const campaignId = createRes.data.campaign_id

            const formData = new FormData()
            formData.append("file", file)
            formData.append("campaign_id", campaignId)

            await api.post("/contacts/upload/", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            })

            await api.post("/campaign/send/", { campaign_id: campaignId })

            onCreated({
                campaign_id: campaignId,
                name,
                total: 0,
                sent: 0,
                delivered: 0,
                failed: 0,
            })

        } catch (err) {
            console.error(err)
            toast?.("Something went wrong. Please try again.", "error")
        } finally {
            setLoading(false)
        }
    }

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
                <div>
                    <h2>New Campaign</h2>
                    <p style={styles.subtitle}>Set up and launch a WhatsApp campaign</p>
                </div>
            </div>

            <StepIndicator current={step} />

            {/* Step 0: Upload */}
            {step === 0 && (
                <div className="card" style={styles.stepCard}>
                    <h3 style={styles.sectionTitle}>Upload contacts</h3>
                    <p style={styles.sectionDesc}>
                        Upload a CSV file with your recipient phone numbers. One number per row.
                    </p>

                    <label
                        style={{
                            ...styles.dropzone,
                            ...(dragging ? styles.dropzoneDragging : {}),
                            ...(file ? styles.dropzoneFilled : {}),
                            ...(errors.file ? styles.dropzoneError : {}),
                        }}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                    >
                        <input
                            type="file"
                            accept=".csv"
                            style={{ display: "none" }}
                            onChange={e => {
                                setFile(e.target.files[0])
                                setErrors(prev => ({ ...prev, file: null }))
                            }}
                        />

                        {file ? (
                            <div style={styles.fileInfo}>
                                <div style={styles.fileIcon}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                                        stroke="#25d366" strokeWidth="1.5" strokeLinecap="round">
                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
                                    </svg>
                                </div>
                                <div>
                                    <p style={styles.fileName}>{file.name}</p>
                                    <p style={styles.fileSize}>
                                        {(file.size / 1024).toFixed(1)} KB · Click to replace
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.dropzoneContent}>
                                <div style={styles.uploadIcon}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                                        stroke="#475569" strokeWidth="1.5" strokeLinecap="round">
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                                        <polyline points="17 8 12 3 7 8"/>
                                        <line x1="12" y1="3" x2="12" y2="15"/>
                                    </svg>
                                </div>
                                <p style={styles.dropzoneText}>
                                    Drop your CSV here or <span style={styles.browseLink}>browse</span>
                                </p>
                                <p style={styles.dropzoneHint}>Only .csv files accepted</p>
                            </div>
                        )}
                    </label>

                    <FieldError msg={errors.file} />

                    <div style={styles.stepActions}>
                        <button className="btn-primary" onClick={nextStep}>
                            Continue
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Step 1: Configure */}
            {step === 1 && (
                <div className="card" style={styles.stepCard}>
                    <h3 style={styles.sectionTitle}>Campaign configuration</h3>

                    <div style={styles.field}>
                        <label style={styles.label}>Campaign name <span style={styles.required}>*</span></label>
                        <input
                            placeholder="e.g. Summer Sale 2025"
                            value={name}
                            onChange={e => {
                                setName(e.target.value)
                                setErrors(prev => ({ ...prev, name: null }))
                            }}
                            style={errors.name ? styles.inputError : {}}
                        />
                        <FieldError msg={errors.name} />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Template name <span style={styles.required}>*</span></label>
                        <input
                            placeholder="e.g. promo_template_v2"
                            value={template}
                            onChange={e => {
                                setTemplate(e.target.value)
                                setErrors(prev => ({ ...prev, template: null }))
                            }}
                            style={errors.template ? styles.inputError : {}}
                        />
                        <FieldError msg={errors.template} />
                    </div>

                    <div style={styles.field}>
                        <div style={styles.labelRow}>
                            <label style={styles.label}>Variables</label>
                            <button
                                className="btn-ghost btn-sm"
                                onClick={() => setVariables([...variables, ""])}
                            >
                                + Add variable
                            </button>
                        </div>
                        <div style={styles.fieldGroup}>
                            {variables.map((v, i) => (
                                <div key={i} style={styles.varRow}>
                                    <span style={styles.varBadge}>{"{{" + (i + 1) + "}}"}</span>
                                    <input
                                        placeholder={`Variable ${i + 1}`}
                                        value={v}
                                        onChange={e => {
                                            const copy = [...variables]
                                            copy[i] = e.target.value
                                            setVariables(copy)
                                        }}
                                    />
                                    {variables.length > 1 && (
                                        <button
                                            className="btn-icon"
                                            style={{ padding: "8px", flexShrink: 0 }}
                                            onClick={() => setVariables(variables.filter((_, idx) => idx !== i))}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M18 6L6 18M6 6l12 12"/>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={styles.field}>
                        <div style={styles.labelRow}>
                            <label style={styles.label}>Buttons</label>
                            <button
                                className="btn-ghost btn-sm"
                                onClick={() => setButtons([...buttons, { id: "", title: "" }])}
                            >
                                + Add button
                            </button>
                        </div>
                        <div style={styles.fieldGroup}>
                            {buttons.map((b, i) => (
                                <div key={i} style={styles.btnRow}>
                                    <input
                                        placeholder="Button ID"
                                        value={b.id}
                                        style={{ flex: 1 }}
                                        onChange={e => {
                                            const copy = [...buttons]
                                            copy[i] = { ...copy[i], id: e.target.value }
                                            setButtons(copy)
                                        }}
                                    />
                                    <input
                                        placeholder="Button title"
                                        value={b.title}
                                        style={{ flex: 2 }}
                                        onChange={e => {
                                            const copy = [...buttons]
                                            copy[i] = { ...copy[i], title: e.target.value }
                                            setButtons(copy)
                                        }}
                                    />
                                    {buttons.length > 1 && (
                                        <button
                                            className="btn-icon"
                                            style={{ padding: "8px", flexShrink: 0 }}
                                            onClick={() => setButtons(buttons.filter((_, idx) => idx !== i))}
                                        >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M18 6L6 18M6 6l12 12"/>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={styles.stepActions}>
                        <button className="btn-ghost" onClick={() => setStep(0)}>
                            Back
                        </button>
                        <button className="btn-primary" onClick={nextStep}>
                            Continue
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
                <div className="card" style={styles.stepCard}>
                    <h3 style={styles.sectionTitle}>Review & send</h3>
                    <p style={styles.sectionDesc}>
                        Double-check everything before launching.
                    </p>

                    <div style={styles.reviewGrid}>
                        <div style={styles.reviewItem}>
                            <span style={styles.reviewKey}>Campaign name</span>
                            <span style={styles.reviewVal}>{name}</span>
                        </div>
                        <div style={styles.reviewItem}>
                            <span style={styles.reviewKey}>Template</span>
                            <span style={styles.reviewVal}>{template}</span>
                        </div>
                        <div style={styles.reviewItem}>
                            <span style={styles.reviewKey}>Contacts file</span>
                            <span style={styles.reviewVal}>{file?.name}</span>
                        </div>
                        <div style={styles.reviewItem}>
                            <span style={styles.reviewKey}>Variables</span>
                            <span style={styles.reviewVal}>
                                {variables.filter(Boolean).length > 0
                                    ? variables.filter(Boolean).join(", ")
                                    : "None"}
                            </span>
                        </div>
                        <div style={styles.reviewItem}>
                            <span style={styles.reviewKey}>Buttons</span>
                            <span style={styles.reviewVal}>
                                {buttons.filter(b => b.title).length > 0
                                    ? buttons.filter(b => b.title).map(b => b.title).join(", ")
                                    : "None"}
                            </span>
                        </div>
                    </div>

                    <div style={styles.stepActions}>
                        <button className="btn-ghost" onClick={() => setStep(1)}>
                            Back
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={loading}
                            style={{ minWidth: "160px" }}
                        >
                            {loading ? (
                                <>
                                    <div style={styles.spinner} />
                                    Launching...
                                </>
                            ) : (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                        stroke="white" strokeWidth="2.5" strokeLinecap="round">
                                        <line x1="22" y1="2" x2="11" y2="13"/>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                                    </svg>
                                    Launch Campaign
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: {
        maxWidth: "680px",
    },
    header: {
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
        marginBottom: "28px",
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--text-muted)",
        marginTop: "3px",
    },
    steps: {
        display: "flex",
        alignItems: "center",
        marginBottom: "28px",
    },
    stepItem: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flex: 1,
    },
    stepCircle: {
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-mid)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "600",
        color: "var(--text-muted)",
        flexShrink: 0,
    },
    stepActive: {
        background: "var(--accent)",
        border: "1px solid var(--accent)",
        color: "#fff",
    },
    stepDone: {
        background: "var(--accent)",
        border: "1px solid var(--accent)",
    },
    stepLabel: {
        fontSize: "13px",
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
    },
    stepLabelActive: {
        color: "var(--text-primary)",
        fontWeight: "500",
    },
    stepLine: {
        flex: 1,
        height: "1px",
        background: "var(--border-mid)",
        margin: "0 8px",
    },
    stepLineDone: {
        background: "var(--accent)",
    },
    stepCard: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    sectionTitle: {
        fontSize: "15px",
        fontWeight: "600",
    },
    sectionDesc: {
        fontSize: "13px",
        color: "var(--text-muted)",
        marginTop: "-12px",
    },
    dropzone: {
        display: "block",
        border: "1.5px dashed var(--border-mid)",
        borderRadius: "var(--radius-lg)",
        padding: "32px 24px",
        cursor: "pointer",
        transition: "all 0.15s ease",
        textAlign: "center",
    },
    dropzoneDragging: {
        borderColor: "var(--accent)",
        background: "var(--accent-dim)",
    },
    dropzoneFilled: {
        borderColor: "var(--accent)",
        background: "var(--accent-dim)",
        textAlign: "left",
    },
    dropzoneError: {
        borderColor: "var(--red)",
    },
    dropzoneContent: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
    },
    uploadIcon: {
        width: "44px",
        height: "44px",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-elevated)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "4px",
    },
    dropzoneText: {
        fontSize: "14px",
        color: "var(--text-secondary)",
    },
    browseLink: {
        color: "var(--accent)",
        fontWeight: "500",
    },
    dropzoneHint: {
        fontSize: "12px",
        color: "var(--text-muted)",
    },
    fileInfo: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    fileIcon: {
        width: "40px",
        height: "40px",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-elevated)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    fileName: {
        fontSize: "14px",
        fontWeight: "500",
        color: "var(--text-primary)",
    },
    fileSize: {
        fontSize: "12px",
        color: "var(--text-muted)",
        marginTop: "2px",
    },
    field: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        fontSize: "13px",
        fontWeight: "500",
        color: "var(--text-secondary)",
    },
    required: {
        color: "var(--red)",
        marginLeft: "2px",
    },
    labelRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    varRow: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    varBadge: {
        fontSize: "12px",
        fontWeight: "600",
        color: "var(--text-muted)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-mid)",
        borderRadius: "var(--radius-sm)",
        padding: "4px 8px",
        flexShrink: 0,
        fontFamily: "monospace",
    },
    btnRow: {
        display: "flex",
        gap: "8px",
        alignItems: "center",
    },
    fieldError: {
        fontSize: "12px",
        color: "var(--red)",
        marginTop: "-4px",
    },
    inputError: {
        borderColor: "var(--red)",
    },
    stepActions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "10px",
        paddingTop: "4px",
        borderTop: "1px solid var(--border)",
    },
    reviewGrid: {
        display: "flex",
        flexDirection: "column",
        gap: "0",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
    },
    reviewItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        gap: "16px",
    },
    reviewKey: {
        fontSize: "13px",
        color: "var(--text-muted)",
        flexShrink: 0,
    },
    reviewVal: {
        fontSize: "13px",
        fontWeight: "500",
        color: "var(--text-primary)",
        textAlign: "right",
        wordBreak: "break-all",
    },
    spinner: {
        width: "14px",
        height: "14px",
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "white",
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
    },
}
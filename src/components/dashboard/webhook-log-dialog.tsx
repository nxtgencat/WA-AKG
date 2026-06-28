"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    History, 
    Loader2, 
    ChevronDown, 
    Copy, 
    RefreshCw, 
    ArrowLeft, 
    ArrowRight, 
    FileJson, 
    ShieldCheck, 
    Info, 
    AlertCircle 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WebhookLog {
    id: string;
    webhookId: string;
    event: string;
    status: string;
    requestUrl: string;
    requestHeaders?: any;
    requestBody?: any;
    responseStatusCode?: number;
    responseBody?: string;
    responseTimeMs?: number;
    errorMessage?: string;
    createdAt: string;
}

interface Props {
    webhookId: string;
    webhookName: string;
    targetSessionId: string;
    open: boolean;
    onClose: () => void;
}

function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function formatTimeOnly(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatJson(obj: any): string {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

export default function WebhookLogDialog({ webhookId, webhookName, targetSessionId, open, onClose }: Props) {
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [meta, setMeta] = useState({ total: 0, offset: 0 });
    const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"payload" | "response" | "headers">("payload");
    const [showMobileDetails, setShowMobileDetails] = useState(false);

    // Reset log selection when dialog changes state
    useEffect(() => {
        if (open) {
            setSelectedLogId(null);
            setShowMobileDetails(false);
            setActiveTab("payload");
        }
    }, [open]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/webhooks/${targetSessionId}/${webhookId}/logs?limit=50&offset=0`);
            if (res.ok) {
                const data = await res.json();
                const fetched = data?.data || [];
                setLogs(fetched);
                setMeta({ total: data.total || 0, offset: 50 });
                // Auto-select the first log if none is selected
                setSelectedLogId(prev => {
                    if (prev && fetched.some((l: WebhookLog) => l.id === prev)) {
                        return prev;
                    }
                    return fetched[0]?.id || null;
                });
            }
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setLoading(false);
        }
    }, [webhookId, targetSessionId]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const res = await fetch(`/api/webhooks/${targetSessionId}/${webhookId}/logs?limit=50&offset=${meta.offset}`);
            if (res.ok) {
                const data = await res.json();
                const newEntries = data?.data || [];
                setLogs(prev => [...prev, ...newEntries]);
                setMeta(prev => ({ total: data.total || prev.total, offset: prev.offset + newEntries.length }));
            }
        } catch (e) {
            console.error("Failed to load more", e);
        } finally {
            setLoadingMore(false);
        }
    };

    // Use a ref to store the latest log ID to prevent stale closures in polling interval
    const latestLogIdRef = useRef<string | null>(null);
    useEffect(() => {
        latestLogIdRef.current = logs[0]?.id || null;
    }, [logs]);

    // Realtime polling
    useEffect(() => {
        if (!open) return;
        fetchLogs();
        
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/webhooks/${targetSessionId}/${webhookId}/logs?limit=1&offset=0`);
                if (res.ok) {
                    const data = await res.json();
                    const latest = data?.data?.[0];
                    if (latest && latest.id !== latestLogIdRef.current) {
                        // Silent update (without full loading state) to avoid UI flickering/resetting
                        const silentRes = await fetch(`/api/webhooks/${targetSessionId}/${webhookId}/logs?limit=50&offset=0`);
                        if (silentRes.ok) {
                            const silentData = await silentRes.json();
                            const fetched = silentData?.data || [];
                            setLogs(fetched);
                            setMeta({ total: silentData.total || 0, offset: 50 });
                            setSelectedLogId(prev => {
                                if (prev && fetched.some((l: WebhookLog) => l.id === prev)) {
                                    return prev;
                                }
                                return fetched[0]?.id || null;
                            });
                        }
                    }
                }
            } catch { /* silent */ }
        }, 5000);
        return () => clearInterval(interval);
    }, [open, webhookId, targetSessionId, fetchLogs]);

    const copyToClipboard = (text: string, message: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(message);
    };

    const shown = logs.length;
    const total = meta.total;
    const hasMore = shown < total;

    const selectedLog = logs.find(l => l.id === selectedLogId) || null;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-5xl w-[95vw] h-[85vh] flex flex-col p-0 overflow-hidden gap-0">
                <DialogHeader className="p-4 sm:p-6 border-b shrink-0 flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <History className="h-5 w-5 text-primary" />
                            Webhook Delivery Logs
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            {webhookName} — View request payloads, response bodies, and delivery metrics.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {loading && logs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p>Loading webhook logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground space-y-3 p-6 text-center">
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                            <History className="h-6 w-6 opacity-60" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800">No delivery logs yet</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[320px]">
                                Logs will appear here after events are dispatched or when you trigger a webhook test.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                        {/* Left Column: Logs List */}
                        <div className={cn(
                            "w-full md:w-[320px] lg:w-[360px] xl:w-[380px] border-r border-slate-100 flex flex-col min-h-0 bg-slate-50/30",
                            showMobileDetails ? "hidden md:flex" : "flex"
                        )}>
                            {/* Logs List Subheader */}
                            <div className="p-3 border-b flex items-center justify-between text-xs text-muted-foreground shrink-0 bg-slate-100/40">
                                <span className="flex items-center gap-2">
                                    <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                                        {total} total
                                    </span>
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                                        Live
                                    </span>
                                </span>
                                <div className="flex items-center gap-1">
                                    {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={fetchLogs}
                                        title="Refresh logs"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>

                            {/* Scroll Area */}
                            <ScrollArea className="flex-1 min-h-0">
                                <div className="divide-y divide-slate-100">
                                    {logs.map((log) => {
                                        const isSelected = log.id === selectedLogId;
                                        const isSuccess = log.status === "SUCCESS";
                                        const isStatusError = log.responseStatusCode && log.responseStatusCode >= 400;

                                        return (
                                            <button
                                                key={log.id}
                                                onClick={() => {
                                                    setSelectedLogId(log.id);
                                                    setShowMobileDetails(true);
                                                }}
                                                className={cn(
                                                    "w-full text-left p-3 flex flex-col gap-1 transition-all",
                                                    isSelected 
                                                        ? "bg-slate-100/80 border-l-2 border-primary" 
                                                        : "hover:bg-slate-50/50 border-l-2 border-transparent"
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-2 w-full">
                                                    <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 border text-slate-800 truncate max-w-[120px] lg:max-w-[160px]">
                                                        {log.event}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                        {formatTimeOnly(log.createdAt)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <Badge
                                                        variant={isSuccess ? "default" : "destructive"}
                                                        className={cn(
                                                            "text-[9px] px-1.5 py-0 font-medium tracking-wide uppercase",
                                                            isSuccess ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
                                                        )}
                                                    >
                                                        {isSuccess ? "Success" : "Failed"}
                                                    </Badge>

                                                    {log.responseStatusCode != null && (
                                                        <span className={cn(
                                                            "text-[11px] font-mono font-bold",
                                                            isStatusError ? "text-red-500" : "text-emerald-600"
                                                        )}>
                                                            {log.responseStatusCode}
                                                        </span>
                                                    )}

                                                    {log.responseTimeMs != null && (
                                                        <span className="text-[10px] text-muted-foreground font-mono">
                                                            {log.responseTimeMs}ms
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-[10px] font-mono text-muted-foreground truncate w-full mt-1 opacity-70">
                                                    {log.requestUrl}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Load more */}
                                {hasMore ? (
                                    <div className="p-3 border-t bg-slate-50/20">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full text-xs"
                                            onClick={loadMore}
                                            disabled={loadingMore}
                                        >
                                            {loadingMore ? (
                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            ) : (
                                                <ChevronDown className="h-3 w-3 mr-1" />
                                            )}
                                            Load {total - shown} more
                                        </Button>
                                    </div>
                                ) : shown > 0 ? (
                                    <div className="p-4 border-t text-[10px] text-center text-muted-foreground bg-slate-50/10">
                                        Showing all {total} logs
                                    </div>
                                ) : null}
                            </ScrollArea>
                        </div>

                        {/* Right Column: Log Details */}
                        <div className={cn(
                            "flex-1 flex flex-col min-h-0 bg-background",
                            !showMobileDetails ? "hidden md:flex" : "flex"
                        )}>
                            {selectedLog ? (
                                <div className="flex-1 flex flex-col min-h-0">
                                    {/* Details Subheader */}
                                    <div className="p-4 border-b flex flex-col gap-3 bg-slate-50/30 shrink-0">
                                        <div className="flex items-center justify-between gap-2">
                                            {/* Mobile Back Button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="md:hidden -ml-2 text-xs flex items-center gap-1"
                                                onClick={() => setShowMobileDetails(false)}
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                                Back to List
                                            </Button>
                                            
                                            <span className="text-[10px] text-muted-foreground font-mono truncate hidden md:inline">
                                                LOG ID: {selectedLog.id}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-xs font-semibold font-mono bg-slate-100 border px-2 py-0.5 rounded text-slate-800">
                                                {selectedLog.event}
                                            </span>

                                            <Badge
                                                variant={selectedLog.status === "SUCCESS" ? "default" : "destructive"}
                                                className={cn(
                                                    "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                                    selectedLog.status === "SUCCESS" ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
                                                )}
                                            >
                                                {selectedLog.status}
                                            </Badge>

                                            {selectedLog.responseStatusCode != null && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">Status:</span>
                                                    <span className={cn(
                                                        "text-xs font-bold font-mono",
                                                        selectedLog.responseStatusCode >= 400 ? "text-red-500" : "text-emerald-600"
                                                    )}>
                                                        {selectedLog.responseStatusCode}
                                                    </span>
                                                </div>
                                            )}

                                            {selectedLog.responseTimeMs != null && (
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-muted-foreground">Latency:</span>
                                                    <span className="text-xs font-semibold font-mono text-slate-700">
                                                        {selectedLog.responseTimeMs}ms
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* URL bar */}
                                        <div className="flex items-center gap-2 bg-slate-100/60 p-2 rounded-lg border border-slate-200/50">
                                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 select-none px-1">
                                                POST
                                            </span>
                                            <div className="text-[11px] font-mono text-slate-700 truncate flex-1 select-all" title={selectedLog.requestUrl}>
                                                {selectedLog.requestUrl}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                                                onClick={() => copyToClipboard(selectedLog.requestUrl, "URL copied to clipboard")}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Info className="h-3.5 w-3.5 text-muted-foreground/80" />
                                            Attempted at {formatTime(selectedLog.createdAt)}
                                        </div>
                                    </div>

                                    {/* Error Message banner */}
                                    {selectedLog.errorMessage && (
                                        <div className="m-4 mb-0 p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-lg flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="font-semibold">Delivery Failure</p>
                                                <p className="font-mono break-all">{selectedLog.errorMessage}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tabs */}
                                    <div className="flex-1 flex flex-col min-h-0 p-4">
                                        <div className="flex border-b mb-3 gap-1 shrink-0">
                                            <button
                                                onClick={() => setActiveTab("payload")}
                                                className={cn(
                                                    "px-3 py-1.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                                                    activeTab === "payload"
                                                        ? "border-primary text-primary font-bold"
                                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <FileJson className="h-3.5 w-3.5" />
                                                Request Body
                                            </button>
                                            <button
                                                onClick={() => setActiveTab("response")}
                                                className={cn(
                                                    "px-3 py-1.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                                                    activeTab === "response"
                                                        ? "border-primary text-primary font-bold"
                                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <ArrowRight className="h-3.5 w-3.5" />
                                                Response Body
                                            </button>
                                            <button
                                                onClick={() => setActiveTab("headers")}
                                                className={cn(
                                                    "px-3 py-1.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                                                    activeTab === "headers"
                                                        ? "border-primary text-primary font-bold"
                                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                Headers
                                            </button>
                                        </div>

                                        {/* Tab contents */}
                                        <div className="flex-1 min-h-0 bg-slate-950 text-slate-100 rounded-lg overflow-hidden relative flex flex-col">
                                            <ScrollArea className="flex-1 p-4">
                                                {activeTab === "payload" && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 select-none">
                                                                JSON Payload
                                                            </span>
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                className="h-6 px-2 py-0 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200"
                                                                onClick={() => copyToClipboard(
                                                                    formatJson(selectedLog.requestBody),
                                                                    "Request payload copied"
                                                                )}
                                                            >
                                                                <Copy className="h-3 w-3 mr-1" />
                                                                Copy
                                                            </Button>
                                                        </div>
                                                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-text py-2">
                                                            {selectedLog.requestBody 
                                                                ? formatJson(selectedLog.requestBody) 
                                                                : "{}"}
                                                        </pre>
                                                    </div>
                                                )}

                                                {activeTab === "response" && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 select-none">
                                                                Server Response
                                                            </span>
                                                            {selectedLog.responseBody && (
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="h-6 px-2 py-0 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200"
                                                                    onClick={() => copyToClipboard(
                                                                        selectedLog.responseBody || "",
                                                                        "Response body copied"
                                                                    )}
                                                                >
                                                                    <Copy className="h-3 w-3 mr-1" />
                                                                    Copy
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-text py-2 break-all whitespace-pre-wrap">
                                                            {selectedLog.responseBody 
                                                                ? selectedLog.responseBody 
                                                                : "No response body returned from server."}
                                                        </pre>
                                                    </div>
                                                )}

                                                {activeTab === "headers" && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] uppercase font-bold text-slate-400 select-none">
                                                                HTTP Request Headers
                                                            </span>
                                                            {selectedLog.requestHeaders && (
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    className="h-6 px-2 py-0 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200"
                                                                    onClick={() => copyToClipboard(
                                                                        formatJson(selectedLog.requestHeaders),
                                                                        "Request headers copied"
                                                                    )}
                                                                >
                                                                    <Copy className="h-3 w-3 mr-1" />
                                                                    Copy
                                                                </Button>
                                                            )}
                                                        </div>
                                                        <pre className="font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed select-text py-2">
                                                            {selectedLog.requestHeaders 
                                                                ? formatJson(selectedLog.requestHeaders) 
                                                                : "{}"}
                                                        </pre>
                                                    </div>
                                                )}
                                            </ScrollArea>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center space-y-3 bg-slate-50/10">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                        <FileJson className="h-6 w-6" />
                                    </div>
                                    <div className="max-w-[280px]">
                                        <h4 className="text-sm font-semibold text-slate-800">No Log Selected</h4>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Select a webhook attempt from the sidebar to inspect detailed metadata and payloads.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

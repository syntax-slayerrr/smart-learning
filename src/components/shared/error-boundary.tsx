"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-3xl bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl border border-red-200/80 dark:border-red-900/40 shadow-sm text-center space-y-3 my-4">
          <div className="mx-auto h-10 w-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {this.props.fallbackTitle || "Komponen Sementara Mengalami Kendala"}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Terjadi gangguan saat memuat data tampilan. Anda dapat memuat ulang komponen tanpa meninggalkan halaman ini.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={this.handleReset}
            className="text-xs h-8 gap-1.5 border-red-200 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Muat Ulang Bagian Ini
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

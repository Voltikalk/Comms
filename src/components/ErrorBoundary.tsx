import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0e1621] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-[#17212b] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold">
              ⚠️
            </div>

            <h2 className="text-xl font-bold text-white">
              Что-то пошло не так
            </h2>

            <p className="text-xs text-slate-400 leading-relaxed">
              Произошла ошибка при загрузке интерфейса. Нажмите кнопку ниже, чтобы перезагрузить приложение.
            </p>

            {this.state.error && (
              <div className="w-full text-left bg-black/40 rounded-xl p-3 text-[11px] font-mono text-rose-300 max-h-36 overflow-auto break-all border border-rose-500/20">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full mt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 text-xs font-bold rounded-xl bg-[#3390ec] text-white hover:bg-[#2882db] transition-all cursor-pointer"
              >
                Перезагрузить страницу
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 text-xs font-semibold rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-all cursor-pointer"
              >
                Сбросить кэш и войти
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

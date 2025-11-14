/**
 * Pyodide Runner - Execute Python code in the browser using Pyodide
 * Handles initialization, code execution, output capture, and matplotlib rendering
 */

export type ExecutionResult = {
  stdout: string;
  stderr: string;
  error?: string;
  result?: any;
  plots?: string[]; // Base64 encoded images
};

export type PyodideRunner = {
  isLoading: boolean;
  isReady: boolean;
  execute: (code: string) => Promise<ExecutionResult>;
  loadPackage: (packageName: string) => Promise<void>;
};

let pyodideInstance: any = null;
let isInitializing = false;

/**
 * Initialize Pyodide and load it into memory
 */
async function initializePyodide(): Promise<any> {
  if (pyodideInstance) {
    return pyodideInstance;
  }

  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return pyodideInstance;
  }

  isInitializing = true;

  try {
    // Clear any existing pyodide global to prevent version conflicts
    if ((window as any).pyodide) {
      console.log("🧹 [PYODIDE] Clearing existing global instance");
      (window as any).pyodide = undefined;
    }

    // Load Pyodide script if not already loaded
    if ((window as any).loadPyodide) {
      console.log("✅ [PYODIDE] loadPyodide already available");
    } else {
      console.log("📦 [PYODIDE] Loading Pyodide script from CDN...");

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
      script.async = true;
      script.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        script.onload = () => {
          console.log("✅ [PYODIDE] Pyodide script loaded successfully");
          resolve();
        };
        script.onerror = () => {
          reject(new Error("Failed to load Pyodide script from CDN"));
        };
        document.head.appendChild(script);
      });
    }

    // Load Pyodide from CDN (using 0.25.1 for better stability and filesystem compatibility)
    const pyodide = await (window as any).loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
    });

    console.log("📦 [PYODIDE] Pyodide core loaded, loading packages...");

    // Setup matplotlib for browser rendering (optional, load on demand)
    try {
      await pyodide.loadPackage(["matplotlib", "numpy"]);
      console.log("📦 [PYODIDE] Matplotlib and numpy loaded");
    } catch (pkgError) {
      console.warn(
        "⚠️ [PYODIDE] Failed to load matplotlib/numpy, continuing without them:",
        pkgError
      );
      // Continue without matplotlib - users can still run basic Python code
    }

    // Configure matplotlib to use AGG backend (non-interactive, for image generation)
    try {
      await pyodide.runPythonAsync(`
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import io
import base64

# Global list to store plots
_plots = []

def _capture_plot():
    """Capture current matplotlib figure as base64 PNG"""
    global _plots
    if plt.get_fignums():
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        _plots.append(img_base64)
        plt.close('all')
        buf.close()

# Override plt.show() to capture instead of displaying
_original_show = plt.show
def _custom_show(*args, **kwargs):
    _capture_plot()
plt.show = _custom_show
`);
      console.log("📦 [PYODIDE] Matplotlib configuration complete");
    } catch (configError) {
      console.warn(
        "⚠️ [PYODIDE] Failed to configure matplotlib, continuing without plot support:",
        configError
      );
    }

    // Initialize _plots list even if matplotlib isn't loaded
    try {
      await pyodide.runPythonAsync("_plots = []");
    } catch (_e) {
      // Ignore if already exists
    }

    pyodideInstance = pyodide;
    console.log("✅ Pyodide initialized successfully");
    return pyodide;
  } catch (error) {
    console.error("❌ Failed to initialize Pyodide:", error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Execute Python code and capture output
 */
export async function executePython(
  code: string,
  timeout = 30_000
): Promise<ExecutionResult> {
  const pyodide = await initializePyodide();

  let stdout = "";
  let stderr = "";
  let error: string | undefined;
  let result: any;
  let plots: string[] = [];

  try {
    // Clear previous plots
    await pyodide.runPythonAsync("_plots = []");

    // Capture stdout and stderr
    pyodide.setStdout({
      batched: (text: string) => {
        stdout += text;
      },
    });

    pyodide.setStderr({
      batched: (text: string) => {
        stderr += text;
      },
    });

    // Execute code with timeout
    const executePromise = pyodide.runPythonAsync(code);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Execution timeout (30s)")), timeout)
    );

    result = await Promise.race([executePromise, timeoutPromise]);

    // Capture any remaining plots
    await pyodide.runPythonAsync("_capture_plot()");

    // Get plots
    const plotsProxy = await pyodide.runPythonAsync("_plots");
    plots = plotsProxy.toJs();
  } catch (err) {
    console.error("Python execution error:", err);
    error = err instanceof Error ? err.message : String(err);
  }

  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    error,
    result,
    plots,
  };
}

/**
 * Load additional Python packages
 */
export async function loadPackage(packageName: string): Promise<void> {
  const pyodide = await initializePyodide();

  try {
    console.log(`📦 Loading package: ${packageName}`);
    await pyodide.loadPackage(packageName);
    console.log(`✅ Package loaded: ${packageName}`);
  } catch (error) {
    console.error(`❌ Failed to load package ${packageName}:`, error);
    throw error;
  }
}

/**
 * Check if Pyodide is initialized and ready
 */
export function isPyodideReady(): boolean {
  return pyodideInstance !== null && !isInitializing;
}

/**
 * Get the current Pyodide instance (if initialized)
 */
export function getPyodideInstance(): any {
  return pyodideInstance;
}

/**
 * Create a Pyodide runner instance
 */
export function createPyodideRunner(): PyodideRunner {
  return {
    isLoading: isInitializing,
    isReady: isPyodideReady(),
    execute: executePython,
    loadPackage,
  };
}

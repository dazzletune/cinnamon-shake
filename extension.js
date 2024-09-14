const St = imports.gi.St;
const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;

const SHAKE_THRESHOLD = 115; // pixels (reduced from 455)
const SHAKE_INTERVAL = 725; // milliseconds
const REQUIRED_SHAKES = 4;

class ShakeExtension {
    constructor() {
        this.isPaused = false;
        this.lastX = 0;
        this.lastY = 0;
        this.lastShake = 0;
        this.shakeCount = 0;
    }

    enable() {
        global.display.connect('window-created', this.onWindowCreated.bind(this));
        let windows = global.get_window_actors();
        for (let window of windows) {
            this.connectWindow(window.meta_window);
        }
    }

    disable() {
        // Clean up code (if needed)
    }

    onWindowCreated(display, metaWindow) {
        this.connectWindow(metaWindow);
    }

    connectWindow(metaWindow) {
        if (metaWindow.get_window_type() === Meta.WindowType.NORMAL) {
            metaWindow.connect('position-changed', this.onWindowMoved.bind(this));
        }
    }

    onWindowMoved(metaWindow) {
        if (this.isPaused) return;

        let [x, y] = metaWindow.get_compositor_private().get_position();
        let currentTime = Date.now();

        global.log('Window moved: ' + x + ', ' + y); // Debug log

        if (currentTime - this.lastShake > SHAKE_INTERVAL) {
            this.shakeCount = 0;
        }

        if (Math.abs(x - this.lastX) > SHAKE_THRESHOLD || Math.abs(y - this.lastY) > SHAKE_THRESHOLD) {
            this.shakeCount++;
            global.log('Shake detected. Count: ' + this.shakeCount); // Debug log
            if (this.shakeCount >= REQUIRED_SHAKES) {
                this.toggleOtherWindows(metaWindow);
                this.shakeCount = 0;

                // Set the pause flag
                this.isPaused = true;

                // Use Mainloop.timeout_add to create a 1.25 second pause
                Mainloop.timeout_add(1250, () => {
                    this.isPaused = false;
                    return false; // Return false to ensure the timeout doesn't repeat
                });
            }
        }

        this.lastX = x;
        this.lastY = y;
        this.lastShake = currentTime;
    }

    toggleOtherWindows(activeWindow) {
        let windows = global.get_window_actors();
        let allMinimized = true;
        let activeWorkspace = global.workspace_manager.get_active_workspace();

        for (let window of windows) {
            let metaWindow = window.meta_window;
            if (metaWindow !== activeWindow &&
                metaWindow.get_window_type() === Meta.WindowType.NORMAL &&
                metaWindow.get_workspace() === activeWorkspace) {
                if (!metaWindow.minimized) {
                    allMinimized = false;
                    break;
                }
            }
        }

        global.log('Toggling windows in current workspace. All minimized: ' + allMinimized); // Debug log

        for (let window of windows) {
            let metaWindow = window.meta_window;
            if (metaWindow !== activeWindow &&
                metaWindow.get_window_type() === Meta.WindowType.NORMAL &&
                metaWindow.get_workspace() === activeWorkspace) {
                if (allMinimized) {
                    metaWindow.unminimize();
                } else {
                    metaWindow.minimize();
                }
            }
        }
    }

}

let extension;

function init() {
    extension = new ShakeExtension();
}

function enable() {
    extension.enable();
}

function disable() {
    extension.disable();
}
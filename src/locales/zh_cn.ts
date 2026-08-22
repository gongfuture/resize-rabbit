const zh = {
    "toast": {
        "buttons": {
            "dismiss": "忽略"
        }
    },
    "profile": {
        "process": {
            "title": "进程",
            "description": "您要为其创建调整大小配置文件的应用程序。如果您在打开此屏幕后启动了该程序，请单击刷新按钮。",
            "select": "选择进程",
            "showAll": "显示所有进程",
            "manualEntry": "手动输入进程名称…",
            "manualPlaceholder": "例如 RRRE64.exe"
        },
        "profileName": {
            "title": "配置文件名称",
            "description": "您要创建的配置文件的名称。这将用于在配置文件列表中标识该预设。",
        },
        "preset": {
            "title": "预设",
            "description": "为某些三屏设置预先计算的值。",
            "select": "从预设复制值",
            "options": {
                "triple1080p": "三屏 1080p",
                "triple1440p": "三屏 1440p",
                "triple4k": "三屏 4K",
            }
        },
        "window" : {
            "width": {
                "title": "窗口宽度",
                "description": "如其所示，即窗口的预期宽度。对于三屏设置，这是单个屏幕水平像素的 3 倍。留空则仅重新定位窗口，保持当前宽度不变。",
            },
            "height": {
                "title": "窗口高度",
                "description": "如其所示，即窗口的预期高度。对于三屏设置，这是单个屏幕的高度。留空则仅重新定位窗口，保持当前高度不变。",
            },
            "posY": {
                "title": "窗口位置 Y",
                "description": "窗口在屏幕上的垂直位置。通常为 0。",
            },
            "posX": {
                "title": "窗口位置 X",
                "description": "窗口在屏幕上的水平位置。取决于您的设置。对于三屏显示器，通常为等于单个屏幕宽度的负值。",
            },
            "borderless": {
                "title": "移除边框",
                "description": "移除窗口边框。仅当无法在游戏内选择无边框时使用此选项。",
            },
            "titlebarOffscreen": {
                "title": "移除标题栏",
                "description": "将窗口向上推出屏幕顶部，推出距离等于其标题栏高度，从而使标题栏隐藏到显示器上方。目前仅适用于某些在移除边框后仍显示标题栏的商店/UWP 游戏（例如《极限竞速：地平线 4》）——对其他游戏无效。",
            }
        },
        "autoResize": {
            "title": "自动调整大小",
            "description": "允许在程序启动时自动应用此配置文件（需要全局进程监视）。",
            "enabled": "自动",
            "disabled": "手动",
        },
        "autoResizeDelay": {
            "title": "自动调整延迟（毫秒）",
            "description": "从程序启动到应用配置文件之间的延迟时间（毫秒）。",
        },
        "shortcut": {
            "title": "快捷键",
            "description": "用于应用此配置文件的全局热键，即使应用最小化时也能生效。必须包含至少一个修饰键（Ctrl、Alt、Shift）。同一快捷键可在多个配置文件中重复使用——按下时，将应用于这些配置文件中实际正在运行的游戏。",
            "placeholder": "点击设置快捷键",
            "listening": "按下组合键...（Esc 取消）",
            "clear": "清除快捷键",
            "sharedWith": "同时被以下配置文件使用：{{names}} —— 按下此快捷键将应用于其中实际正在运行的游戏。",
        },
        "buttons": {
            "new": "新建配置文件",
            "test": "应用",
            "cancel": "取消",
            "save": "保存",
            "saveAndClose": "保存并关闭",
            "delete": "删除",
            "deleteConfirmTitle": "删除配置文件",
            "deleteConfirmMessage": "确定要删除“{{name}}”吗？此操作无法撤销。",
        },
    },
    "group": {
        "name": {
            "title": "组名称",
            "description": "组的名称，显示在配置文件列表中。",
        },
        "shortcut": {
            "title": "快捷键",
            "description": "用于同时应用此组中所有配置文件的全局热键——仅实际正在运行的游戏对应的配置文件会被移动。必须包含至少一个修饰键（Ctrl、Alt、Shift）。配置文件自身的快捷键（如果有）仍可独立使用。",
            "sharedWith": "同时被以下对象使用：{{names}}。",
        },
        "memberCount": "{{count}} 个配置文件",
        "removeMember": "从组中移除",
        "buttons": {
            "new": "新建组",
            "cancel": "取消",
            "save": "保存",
            "delete": "删除",
            "deleteConfirmTitle": "删除组",
            "deleteConfirmMessage": "确定要删除“{{name}}”吗？此组中的配置文件不会被删除，只会取消分组。",
        },
    },
    "home": {
        "homepage": "主页",
        "processWatcher": "进程监视器",
        "beta": "测试版",
    },
    "import": {
        "label": "导入 Resize Raccoon 配置文件",
        "button": "导入",
        "success": "已从 Resize Raccoon 导入 {{count}} 个配置文件。",
        "none": "在 Resize Raccoon 数据中未找到新的配置文件。",
        "error": "找不到要导入的 Resize Raccoon 数据。",
        "promptTitle": "导入 Resize Raccoon 配置文件？",
        "promptMessage": "我们找到了现有的 Resize Raccoon 配置文件，但尚未找到 Resize Rabbit 配置文件。是否立即导入？",
    },
    "settings": {
        "language": {
            "title": "语言",
        },
        "checkForUpdates": {
            "title": "启动时检查更新",
        },
        "processPollRate": {
            "title": "进程轮询间隔（毫秒）",
            "description": "检查新应用程序启动的频率。",
        },
        "launchOnStart": {
            "title": "随 Windows 启动"
        },
        "startMinimized": {
            "title": "启动时最小化",
            "description": "启动程序时最小化到系统托盘。",
        },
        "closeToTray": {
            "title": "关闭到系统托盘",
            "description": "关闭程序时最小化到系统托盘，而不是退出。",
        },
        "loggingEnabled": {
            "title": "日志记录",
            "description": "将诊断日志写入每个用户的应用程序数据文件夹（不在 .exe 旁边——没有管理员权限时 Program Files 不可写）。使用下面的链接可直接打开。在排查问题时很有用——完成后请关闭。",
            "openFolder": "打开日志文件夹",
            "openFolderError": "无法打开日志文件夹。",
        }
    },
    "attribution": "基于 {{author}} 的 {{name}}",
    "errors": {
        "window_manager": {
            "process_not_found": "未找到进程，请确保您要控制的应用程序正在运行。",
            "apply_failed": "应用配置文件失败，原因未知。是否重试？",
            "access_deined": "应用配置文件失败，访问被拒绝。请尝试以管理员身份运行 Resize Rabbit。",
            "invalid_pid": "应用配置文件失败，进程 ID 无效。您永远不会看到此错误。如果看到了，您就中奖了。",
        },
        "profile": {
            "not_found": "未找到配置文件，请重启程序以同步配置文件。",
            "profile_path_error": "无法定位配置文件路径，这很糟糕，但不应发生。不知道，我猜只要别删除应用程序数据文件夹就行。",
        },
        "group": {
            "not_found": "未找到组，请重启程序以同步组。",
            "group_path_error": "无法定位组路径，这很糟糕，但不应发生。不知道，我猜只要别删除应用程序数据文件夹就行。",
        },
        "settings": {
            "launch_on_start_error": "无法切换开机启动",
            "unable_to_fetch_app_data": "无法获取应用程序元数据",
            "settings_path_error": "无法定位 settings.json 文件",
        },
        "unknown": "意外错误"
    }
}

export default zh;

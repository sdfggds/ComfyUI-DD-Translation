import { app } from "../../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";
import { applyMenuTranslation, observeFactory } from "./MenuTranslate.js";
import { 
  containsChineseCharacters, 
  nativeTranslatedSettings,
  isTranslationEnabled, 
  toggleTranslation,
  log,
  error,
  startPerformanceTimer,
  endPerformanceTimer,
  getCachedTranslation,
  setCachedTranslation 
} from "./utils.js";

// Translation Utils
export class TUtils {
  static TRANSLATION_ENABLED = "DD.TranslationEnabled";

  static T = {
    Menu: {},
    Nodes: {},
    NodeCategory: {},
  };
  static ELS = {};

  /**
   * 异步获取并同步翻译数据
   * @param {Function} OnFinished 完成回调函数
   */
  static async syncTranslation(OnFinished = () => {}) {
    try {
      // 如果翻译被禁用，直接返回
      if (!isTranslationEnabled()) {
        OnFinished();
        return;
      }
      
      const startTime = startPerformanceTimer();
      
      // 使用异步fetch API替代同步XMLHttpRequest
      try {
        const response = await fetch("./agl/get_translation", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `locale=zh-CN`
        });
        
        if (!response.ok) {
          throw new Error(`请求翻译数据失败: ${response.status} ${response.statusText}`);
        }
        
        const resp = await response.json();
        for (var key in TUtils.T) {
          if (key in resp) TUtils.T[key] = resp[key];
          else TUtils.T[key] = {};
        }
        
        // 如果ComfyUI已经设置为中文，则只翻译节点和自定义内容
        const isComfyUIChineseNative = document.documentElement.lang === 'zh-CN';
        const onlyTranslateNodes = isComfyUIChineseNative;
        
        // 如果ComfyUI已经原生支持中文，则过滤掉与原生支持冲突的菜单项
        if (onlyTranslateNodes) {
          // 过滤掉已经原生支持的菜单项
          const originalMenu = TUtils.T.Menu || {};
          TUtils.T.Menu = {};
          for (const key in originalMenu) {
            // 如果不在原生翻译列表中，或者不包含中文，保留
            if (!nativeTranslatedSettings.includes(key) && 
                !nativeTranslatedSettings.includes(originalMenu[key]) &&
                !containsChineseCharacters(key)) {
              TUtils.T.Menu[key] = originalMenu[key];
            }
          }
        } else {
          // 合并NodeCategory 到 Menu
          TUtils.T.Menu = Object.assign(TUtils.T.Menu || {}, TUtils.T.NodeCategory || {});
        }
        
        // 提取 Node 中 key 到 Menu
        for (let key in TUtils.T.Nodes) {
          let node = TUtils.T.Nodes[key];
          if(node && node["title"]) {
            TUtils.T.Menu = TUtils.T.Menu || {};
            TUtils.T.Menu[key] = node["title"] || key;
          }
        }
        
        endPerformanceTimer("获取翻译数据", startTime);
        
      } catch (e) {
        error("获取翻译数据失败:", e);
      }
      
      OnFinished();
    } catch (err) {
      error("同步翻译过程出错:", err);
      OnFinished();
    }
  }
  
  /**
   * 增强节点小部件绘制，显示精确数值
   */
  static enhandeDrawNodeWidgets() {
    try {
      // 移除了对主题颜色的检测，使用通用处理方式
      let drawNodeWidgets = LGraphCanvas.prototype.drawNodeWidgets;
      LGraphCanvas.prototype.drawNodeWidgets = function (node, posY, ctx, active_widget) {
        if (!node.widgets || !node.widgets.length) {
          return 0;
        }
        const widgets = node.widgets.filter((w) => w.type === "slider");
        widgets.forEach((widget) => {
          widget._ori_label = widget.label;
          const fixed = widget.options.precision != null ? widget.options.precision : 3;
          widget.label = (widget.label || widget.name) + ": " + Number(widget.value).toFixed(fixed).toString();
        });
        let result;
        try {
          result = drawNodeWidgets.call(this, node, posY, ctx, active_widget);
        } finally {
          widgets.forEach((widget) => {
            widget.label = widget._ori_label;
            delete widget._ori_label;
          });
        }
        return result;
      };
    } catch (e) {
      error("增强节点小部件绘制失败:", e);
    }
  }
  
  /**
   * 为特定节点类型应用翻译
   * @param {string} nodeName 节点名称
   */
  static applyNodeTypeTranslationEx(nodeName) {
    try {
      let nodesT = this.T.Nodes;
      var nodeType = LiteGraph.registered_node_types[nodeName];
      if (!nodeType) return;
      
      let class_type = nodeType.comfyClass ? nodeType.comfyClass : nodeType.type;
      if (nodesT.hasOwnProperty(class_type)) {
        nodeType.title = nodesT[class_type]["title"] || nodeType.title;
      }
    } catch (e) {
      error(`为节点类型 ${nodeName} 应用翻译失败:`, e);
    }
  }

  /**
   * 为Vue节点定义应用显示名称翻译
   * @param {Object} nodeDef 节点定义对象
   */
  static applyVueNodeDisplayNameTranslation(nodeDef) {
    try {
      const nodesT = TUtils.T.Nodes;
      const class_type = nodeDef.name;
      if (nodesT.hasOwnProperty(class_type)) {
        nodeDef.display_name = nodesT[class_type]["title"] || nodeDef.display_name;
      }
    } catch (e) {
      error(`为Vue节点 ${nodeDef?.name} 应用显示名称翻译失败:`, e);
    }
  }

  /**
   * 为Vue节点定义应用翻译
   * @param {Object} nodeDef 节点定义对象
   */
  static applyVueNodeTranslation(nodeDef) {
    try {
      const catsT = TUtils.T.NodeCategory;
      const nodesT = TUtils.T.Nodes;
      const nodeT = TUtils.T.Nodes[nodeDef.name];
      
      // 翻译分类
      if (!nodeDef.category) return;
      const catArr = nodeDef.category.split("/");
      nodeDef.category = catArr.map((cat) => catsT?.[cat] || cat).join("/");
      
      // 其余处理可以根据需要添加
    } catch (e) {
      error(`为Vue节点 ${nodeDef?.name} 应用翻译失败:`, e);
    }
  }

  /**
   * 为所有注册的节点类型应用翻译
   * @param {Object} app ComfyUI app对象
   */
  static applyNodeTypeTranslation(app) {
    try {
      // 如果翻译被禁用，直接返回
      if (!isTranslationEnabled()) return;
      
      const startTime = startPerformanceTimer();
      
      for (let nodeName in LiteGraph.registered_node_types) {
        this.applyNodeTypeTranslationEx(nodeName);
      }
      
      endPerformanceTimer("应用节点类型翻译", startTime);
    } catch (e) {
      error("应用节点类型翻译失败:", e);
    }
  }

  /**
   * 为节点实例应用翻译
   * @param {Object} node 节点实例
   */
  static applyNodeTranslation(node) {
    try {
      const startTime = startPerformanceTimer();
      
      let keys = ["inputs", "outputs", "widgets"];
      let nodesT = this.T.Nodes;
      let class_type = node.constructor.comfyClass ? node.constructor.comfyClass : node.constructor.type;
      
      if (!nodesT.hasOwnProperty(class_type)) {
        for (let key of keys) {
          if (!node.hasOwnProperty(key) || !Array.isArray(node[key])) continue;
          node[key].forEach((item) => {
            if (item?.hasOwnProperty("name")) item.label = item.name;
          });
        }
        return;
      }
      
      var t = nodesT[class_type];
      for (let key of keys) {
        if (!t.hasOwnProperty(key)) continue;
        if (!node.hasOwnProperty(key)) continue;
        node[key].forEach((item) => {
          if (item?.name in t[key]) {
            item.label = t[key][item.name];
          }
        });
      }
        if (t.hasOwnProperty("title")) {
        // 检查节点是否有用户自定义标题标记
        const hasCustomTitle = node._dd_custom_title || false;
        // 检查当前标题是否与原始类型标题不同（表示用户可能已修改）
        const originalTitle = node.constructor.comfyClass || node.constructor.type;
        const isCustomizedTitle = node.title && node.title !== originalTitle && node.title !== t["title"];
        
        // 如果没有自定义标题且当前标题不是用户修改的，才应用翻译
        if (!hasCustomTitle && !isCustomizedTitle) {
          node.title = t["title"];
          node.constructor.title = t["title"];
        }
      }
      
      // 转换 widget 到 input 时需要刷新socket信息
      let addInput = node.addInput;
      node.addInput = function (name, type, extra_info) {
        var oldInputs = [];
        this.inputs?.forEach((i) => oldInputs.push(i.name));
        var res = addInput.apply(this, arguments);
        this.inputs?.forEach((i) => {
          if (oldInputs.includes(i.name)) return;
          if (t["widgets"] && i.widget?.name in t["widgets"]) {
            i.label = t["widgets"][i.widget?.name];
          }
        });
        return res;
      };
      
      let onInputAdded = node.onInputAdded;
      node.onInputAdded = function (slot) {
        if (onInputAdded) var res = onInputAdded.apply(this, arguments);
        let t = TUtils.T.Nodes[this.comfyClass];
        if (t?.["widgets"] && slot.name in t["widgets"]) {
          slot.localized_name = t["widgets"][slot.name];
        }
        if (onInputAdded) return res;
      };
      
      endPerformanceTimer("应用节点翻译", startTime);
    } catch (e) {
      error(`为节点 ${node?.title || '未知'} 应用翻译失败:`, e);
    }
  }

  /**
   * 为节点描述应用翻译
   * @param {Object} nodeType 节点类型
   * @param {Object} nodeData 节点数据
   * @param {Object} app ComfyUI app对象
   */
  static applyNodeDescTranslation(nodeType, nodeData, app) {
    try {
      let nodesT = this.T.Nodes;
      var t = nodesT[nodeType.comfyClass];
      if (t?.["description"]) {
        nodeData.description = t["description"];
      }

      // 输入和widget提示
      if (t) {
        var nodeInputT = t["inputs"] || {};
        var nodeWidgetT = t["widgets"] || {};
        for (let itype in nodeData.input) {
          for (let socketname in nodeData.input[itype]) {
            let inp = nodeData.input[itype][socketname];
            if (inp[1] === undefined || !inp[1].tooltip) continue;
            var tooltip = inp[1].tooltip;
            var tooltipT = nodeInputT[tooltip] || nodeWidgetT[tooltip] || tooltip;
            inp[1].tooltip = tooltipT;
          }
        }
        
        // 输出提示
        var nodeOutputT = t["outputs"] || {};
        for (var i = 0; i < (nodeData.output_tooltips || []).length; i++) {
          var tooltip = nodeData.output_tooltips[i];
          var tooltipT = nodeOutputT[tooltip] || tooltip;
          nodeData.output_tooltips[i] = tooltipT;
        }
      }
    } catch (e) {
      error(`为节点 ${nodeType?.comfyClass || '未知'} 应用描述翻译失败:`, e);
    }
  }

  /**
   * 应用菜单翻译
   * @param {Object} app ComfyUI app对象
   */
  static applyMenuTranslation(app) {
    try {
      // 如果翻译被禁用，直接返回
      if (!isTranslationEnabled()) return;
      
      const startTime = startPerformanceTimer();
      
      // 搜索菜单 常驻菜单
      applyMenuTranslation(TUtils.T);
      
      // Queue size 单独处理
      const dragHandle = app.ui.menuContainer.querySelector(".drag-handle");
      if (dragHandle && dragHandle.childNodes[1]) {
        observeFactory(dragHandle.childNodes[1], (mutationsList, observer) => {
          for (let mutation of mutationsList) {
            for (let node of mutation.addedNodes) {
              var match = node.data?.match(/(Queue size:) (\w+)/);
              if (match?.length == 3) {
                const t = TUtils.T.Menu[match[1]] ? TUtils.T.Menu[match[1]] : match[1];
                node.data = t + " " + match[2];
              }
            }
          }
        });
      }
      
      endPerformanceTimer("应用菜单翻译", startTime);
    } catch (e) {
      error("应用菜单翻译失败:", e);
    }
  }

  /**
   * 应用上下文菜单翻译
   * @param {Object} app ComfyUI app对象
   */
  static applyContextMenuTranslation(app) {
    try {
      // 如果翻译被禁用，直接返回
      if (!isTranslationEnabled()) return;
      
      const startTime = startPerformanceTimer();
      
      // 右键上下文菜单
      var f = LGraphCanvas.prototype.getCanvasMenuOptions;
      LGraphCanvas.prototype.getCanvasMenuOptions = function () {
        var res = f.apply(this, arguments);
        let menuT = TUtils.T.Menu;
        for (let item of res) {
          if (item == null || !item.hasOwnProperty("content")) continue;
          if (item.content in menuT) {
            item.content = menuT[item.content];
          }
        }
        return res;
      };
      
      const f2 = LiteGraph.ContextMenu;
      LiteGraph.ContextMenu = function (values, options) {
        // 右键上下文菜单先从此处翻译, 随后会经过 applyMenuTranslation走通用翻译
        if (options?.hasOwnProperty("title") && options.title in TUtils.T.Nodes) {
          options.title = TUtils.T.Nodes[options.title]["title"] || options.title;
        }
        
        // 翻译菜单项
        var t = TUtils.T.Menu;
        var tN = TUtils.T.Nodes;
        var reInput = /Convert (.*) to input/;
        var reWidget = /Convert (.*) to widget/;
        var cvt = t["Convert "] || "Convert ";
        var tinp = t[" to input"] || " to input";
        var twgt = t[" to widget"] || " to widget";
        
        for (let value of values) {
          if (value == null || !value.hasOwnProperty("content")) continue;
          
          // 子菜单先走 节点标题菜单
          if (value.value in tN) {
            value.content = tN[value.value]["title"] || value.content;
            continue;
          }
          
          // inputs
          if (value.content in t) {
            value.content = t[value.content];
            continue;
          }
          
          var extra_info = options.extra || options.parentMenu?.options?.extra; // for capture translation text of input and widget
          
          // widgets and inputs
          var matchInput = value.content?.match(reInput);
          if (matchInput) {
            var match = matchInput[1];
            extra_info?.inputs?.find((i) => {
              if (i.name != match) return false;
              match = i.label ? i.label : i.name;
            });
            extra_info?.widgets?.find((i) => {
              if (i.name != match) return false;
              match = i.label ? i.label : i.name;
            });
            value.content = cvt + match + tinp;
            continue;
          }
          
          var matchWidget = value.content?.match(reWidget);
          if (matchWidget) {
            var match = matchWidget[1];
            extra_info?.inputs?.find((i) => {
              if (i.name != match) return false;
              match = i.label ? i.label : i.name;
            });
            extra_info?.widgets?.find((i) => {
              if (i.name != match) return false;
              match = i.label ? i.label : i.name;
            });
            value.content = cvt + match + twgt;
            continue;
          }
        }

        const ctx = f2.call(this, values, options);
        return ctx;
      };
      LiteGraph.ContextMenu.prototype = f2.prototype;
      
      endPerformanceTimer("应用上下文菜单翻译", startTime);
    } catch (e) {
      error("应用上下文菜单翻译失败:", e);
    }
  }

  /**
   * 添加节点定义注册回调
   * @param {Object} app ComfyUI app对象
   */
  static addRegisterNodeDefCB(app) {
    try {
      const f = app.registerNodeDef;
      async function af() {
        return f.apply(this, arguments);
      }
      app.registerNodeDef = async function (nodeId, nodeData) {
        var res = af.apply(this, arguments);
        res.then(() => {
          TUtils.applyNodeTypeTranslationEx(nodeId);
        });
        return res;
      };
    } catch (e) {
      error("添加节点定义注册回调失败:", e);
    }
  }
  
  /**
   * 添加面板按钮
   * @param {Object} app ComfyUI app对象
   */
  static addPanelButtons(app) {
    try {
      // 检查是否已有切换按钮
      if(document.getElementById("toggle-translation-button")) return;
      
      const translationEnabled = isTranslationEnabled();
      
      // 创建样式元素，添加按钮动画效果
      const styleElem = document.createElement('style');
      styleElem.textContent = `
        @keyframes flowEffect {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .dd-translation-active {
          background: linear-gradient(90deg, #e6a919, #f4d03f, #f9e79f, #f4d03f, #e6a919);
          background-size: 300% 100%;
          color: #333;
          border: none;
          animation: flowEffect 5s ease infinite;
          text-shadow: 0 1px 1px rgba(0,0,0,0.1);
          box-shadow: 0 0 5px rgba(244, 208, 63, 0.5);
          transition: all 0.3s ease;
        }
        
        .dd-translation-inactive {
          background: linear-gradient(90deg, #1a5276, #2980b9, #3498db, #2980b9, #1a5276);
          background-size: 300% 100%;
          color: white;
          border: none;
          animation: flowEffect 7s ease infinite;
          box-shadow: 0 0 5px rgba(52, 152, 219, 0.5);
          transition: all 0.3s ease;
        }
        
        .dd-translation-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          cursor: pointer;
        }

        .dd-translation-btn {
          cursor: pointer;
        }
      `;
      document.head.appendChild(styleElem);
      
      // 添加旧版UI的切换按钮
      if(document.querySelector(".comfy-menu") && !document.getElementById("toggle-translation-button")) {
        app.ui.menuContainer.appendChild(
          $el("button.dd-translation-btn", {
            id: "toggle-translation-button",
            textContent: translationEnabled ? "附加翻译" : "官方实现",
            className: translationEnabled ? "dd-translation-btn dd-translation-active" : "dd-translation-btn dd-translation-inactive",
            style: {
              fontWeight: "bold",
              fontSize: "12px",
              padding: "5px 10px",
              borderRadius: "4px",
            },
            title: translationEnabled ? "已开启额外附加翻译" : "已使用官方原生翻译",
            onclick: () => {
              toggleTranslation();
            },
          })
        );
      }
      
      // 添加新版UI的切换按钮
      try {
        if(window?.comfyAPI?.button?.ComfyButton && window?.comfyAPI?.buttonGroup?.ComfyButtonGroup) {
          var ComfyButtonGroup = window.comfyAPI.buttonGroup.ComfyButtonGroup;
          var ComfyButton = window.comfyAPI.button.ComfyButton;
          
          var btn = new ComfyButton({
            action: () => {
              toggleTranslation();
            },
            tooltip: translationEnabled ? "已开启额外附加翻译" : "已使用官方原生翻译",
            content: translationEnabled ? "附加翻译" : "官方实现",
            classList: "toggle-translation-button"
          });
          
          // 设置按钮样式
          if(btn.element) {
            btn.element.classList.add("dd-translation-btn");
            btn.element.classList.add(translationEnabled ? "dd-translation-active" : "dd-translation-inactive");
            btn.element.style.fontWeight = "bold";
            btn.element.style.fontSize = "12px";
            btn.element.style.padding = "5px 10px";
            btn.element.style.borderRadius = "4px";
          }
          
          var group = new ComfyButtonGroup(btn.element);
          if(app.menu?.settingsGroup?.element) {
            app.menu.settingsGroup.element.before(group.element);
          }
        }
      } catch(e) {
        error("添加新版UI语言按钮失败:", e);
      }
    } catch (e) {
      error("添加面板按钮失败:", e);
    }
  }
    /**
   * 添加节点标题监听机制
   * @param {Object} app ComfyUI app对象
   */
  static addNodeTitleMonitoring(app) {
    try {
      // 确保LGraphNode存在
      if (typeof LGraphNode === 'undefined') {
        error("LGraphNode未定义，无法设置标题监听");
        return;
      }
      
      // 监听节点标题修改
      const originalSetTitle = LGraphNode.prototype.setTitle || function(title) {
        this.title = title;
      };
      
      LGraphNode.prototype.setTitle = function(title) {
        // 记录这是用户自定义的标题
        if (title && title !== this.constructor.title) {
          this._dd_custom_title = true;
        }
        return originalSetTitle.call(this, title);
      };
      
      // 监听属性变化（处理直接赋值的情况）
      const setupTitleWatcher = (node) => {
        if (node._dd_title_watched) return;
        node._dd_title_watched = true;
        
        let currentTitle = node.title;
        const originalTitle = node.constructor.comfyClass || node.constructor.type;
        
        // 使用Object.defineProperty来监听title属性的变化
        Object.defineProperty(node, '_title', {
          value: currentTitle,
          writable: true,
          enumerable: false
        });
        
        Object.defineProperty(node, 'title', {
          get() {
            return this._title;
          },
          set(newTitle) {
            const oldTitle = this._title;
            this._title = newTitle;
            
            // 检查是否是用户自定义修改
            if (newTitle && newTitle !== originalTitle) {
              // 检查是否是翻译系统设置的标题
              const nodeT = TUtils.T.Nodes[this.constructor.comfyClass || this.constructor.type];
              const isTranslatedTitle = nodeT && nodeT.title === newTitle;
              
              // 如果不是翻译系统设置的，则标记为用户自定义
              if (!isTranslatedTitle && oldTitle !== newTitle) {
                this._dd_custom_title = true;
              }
            }
          },
          enumerable: true,
          configurable: true
        });
      };
      
      // 为现有节点设置监听
      if (app.graph && app.graph._nodes) {
        app.graph._nodes.forEach(setupTitleWatcher);
      }
      
      // 为新创建的节点设置监听
      if (typeof LGraph !== 'undefined' && LGraph.prototype.add) {
        const originalAddNode = LGraph.prototype.add;
        LGraph.prototype.add = function(node) {
          const result = originalAddNode.call(this, node);
          if (node) {
            setupTitleWatcher(node);
          }
          return result;
        };
      }
      
    } catch (e) {
      error("添加节点标题监听失败:", e);
    }
  }
}

const ext = {
  name: "AIGODLIKE.Translation",
  
  /**
   * 初始化扩展
   * @param {Object} app ComfyUI app对象
   */
  async init(app) {
    try {
      // 增强节点小部件
      TUtils.enhandeDrawNodeWidgets();
      
      // 同步翻译数据
      await TUtils.syncTranslation();
    } catch (e) {
      error("扩展初始化失败:", e);
    }
  },
  
  /**
   * 设置扩展
   * @param {Object} app ComfyUI app对象
   */
  async setup(app) {
    try {      // 检查ComfyUI是否已原生中文
      const isComfyUIChineseNative = document.documentElement.lang === 'zh-CN';
      
      // 添加节点标题监听（无论翻译是否启用都需要）
      TUtils.addNodeTitleMonitoring(app);
      
      // 只有在翻译启用时才应用翻译
      if (isTranslationEnabled()) {
        const startTime = startPerformanceTimer();
        
        TUtils.applyNodeTypeTranslation(app);
        TUtils.applyContextMenuTranslation(app);
        
        // 如果ComfyUI已经原生支持中文，只翻译节点和自定义内容
        if (!isComfyUIChineseNative) {
          TUtils.applyMenuTranslation(app);
        }
        
        TUtils.addRegisterNodeDefCB(app);
        
        endPerformanceTimer("扩展设置", startTime);
      }
      
      // 按钮总是添加，方便切换翻译
      TUtils.addPanelButtons(app);
    } catch (e) {
      error("扩展设置失败:", e);
    }
  },
  
  /**
   * 添加自定义节点定义
   * @param {Object} defs 节点定义
   * @param {Object} app ComfyUI app对象
   */
  async addCustomNodeDefs(defs, app) {
    // 添加自定义节点定义
  },
  
  /**
   * 获取自定义小部件
   * @param {Object} app ComfyUI app对象
   */
  async getCustomWidgets(app) {
    // 返回自定义小部件类型
  },
  
  /**
   * 在注册节点定义之前调用
   * @param {Object} nodeType 节点类型
   * @param {Object} nodeData 节点数据
   * @param {Object} app ComfyUI app对象
   */
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    try {
      TUtils.applyNodeDescTranslation(nodeType, nodeData, app);
    } catch (e) {
      error(`注册节点定义前处理失败 (${nodeType?.comfyClass || '未知'}):`, e);
    }
  },
  
  /**
   * 在注册Vue应用节点定义之前调用
   * @param {Array} nodeDefs 节点定义数组
   */
  beforeRegisterVueAppNodeDefs(nodeDefs) {
    try {
      nodeDefs.forEach(TUtils.applyVueNodeDisplayNameTranslation);
      nodeDefs.forEach(TUtils.applyVueNodeTranslation);
    } catch (e) {
      error("注册Vue应用节点定义前处理失败:", e);
    }
  },
  
  /**
   * 注册自定义节点
   * @param {Object} app ComfyUI app对象
   */
  async registerCustomNodes(app) {
    // 注册自定义节点实现
  },
    /**
   * 加载图表节点时调用
   * @param {Object} node 节点
   * @param {Object} app ComfyUI app对象
   */
  loadedGraphNode(node, app) {
    try {
      // 检查节点标题是否已被用户自定义
      const originalTitle = node.constructor.comfyClass || node.constructor.type;
      const nodeT = TUtils.T.Nodes[originalTitle];
      const translatedTitle = nodeT?.title;
      
      // 如果节点标题与原始标题和翻译标题都不同，说明是用户自定义的
      if (node.title && 
          node.title !== originalTitle && 
          node.title !== translatedTitle) {
        node._dd_custom_title = true;
      }
      
      // 只有在翻译启用时才应用翻译
      if (isTranslationEnabled()) {
        TUtils.applyNodeTranslation(node);
      }
    } catch (e) {
      error(`加载图表节点处理失败 (${node?.title || '未知'}):`, e);
    }
  },
  
  /**
   * 创建节点时调用
   * @param {Object} node 节点
   * @param {Object} app ComfyUI app对象
   */
  nodeCreated(node, app) {
    try {
      // 只有在翻译启用时才应用翻译
      if (isTranslationEnabled()) {
        TUtils.applyNodeTranslation(node);
      }
    } catch (e) {
      error(`创建节点处理失败 (${node?.title || '未知'}):`, e);
    }
  },
};

app.registerExtension(ext);

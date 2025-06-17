/**
 * ComfyUI-DD-Translation 工具模块
 * 包含通用功能和工具函数
 */

// 调试模式开关
export const DEBUG_MODE = false;

// 翻译启用状态的本地存储键
export const TRANSLATION_ENABLED_KEY = "DD.TranslationEnabled";

/**
 * 日志函数 - 仅在调试模式下输出
 * @param  {...any} args 日志参数
 */
export function log(...args) {
    if (DEBUG_MODE) {
        console.log("[DD-Translation]", ...args);
    }
}

/**
 * 错误日志函数 - 始终输出
 * @param  {...any} args 错误信息参数
 */
export function error(...args) {
    console.error("[DD-Translation]", ...args);
}

/**
 * 检查文本是否包含中文字符
 * @param {string} text 要检查的文本
 * @returns {boolean} 是否包含中文字符
 */
export function containsChineseCharacters(text) {
    if (!text) return false;
    // 匹配中文字符范围（包括中文标点符号）
    const chineseRegex = /[\u4e00-\u9fff\uf900-\ufaff\u3000-\u303f]/;
    return chineseRegex.test(text);
}

/**
 * 检查文本是否看起来已经被翻译过
 * @param {string} originalName 原始英文名称
 * @param {string} currentLabel 当前显示标签
 * @returns {boolean} 是否已被翻译
 */
export function isAlreadyTranslated(originalName, currentLabel) {
    if (!originalName || !currentLabel) return false;
    
    // 如果标签与原名不同，且包含中文，认为已被翻译
    if (currentLabel !== originalName && containsChineseCharacters(currentLabel)) {
        return true;
    }
    
    // 如果标签与原名不同，且不是简单的小写转换，也可能是翻译
    if (currentLabel !== originalName && 
        currentLabel !== originalName.toLowerCase() &&
        currentLabel !== originalName.toUpperCase()) {
        return true;
    }
    
    return false;
}

/**
 * 不需要翻译的设置项列表 - 这些项目已在原生ComfyUI中翻译
 */
export const nativeTranslatedSettings = [
    "Comfy", "画面", "外观", "3D", "遮罩编辑器",
];

/**
 * 检查翻译是否启用
 */
export function isTranslationEnabled() {
    return localStorage.getItem(TRANSLATION_ENABLED_KEY) !== "false";
}

/**
 * 切换翻译状态
 */
export function toggleTranslation() {
    const enabled = isTranslationEnabled();
    localStorage.setItem(TRANSLATION_ENABLED_KEY, enabled ? "false" : "true");
    
    // 触发翻译状态变化事件，而不是刷新页面
    window.dispatchEvent(new CustomEvent('translation-toggle', { 
        detail: { enabled: !enabled } 
    }));
}
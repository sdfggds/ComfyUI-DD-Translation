/**
 * ComfyUI-DD-Translation 工具模块
 */

// 翻译启用状态的本地存储键
export const TRANSLATION_ENABLED_KEY = "DD.TranslationEnabled";

/**
 * 错误日志函数
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
    
    if (currentLabel !== originalName && containsChineseCharacters(currentLabel)) {
        return true;
    }
    
    if (currentLabel !== originalName && 
        currentLabel !== originalName.toLowerCase() &&
        currentLabel !== originalName.toUpperCase()) {
        return true;
    }
    
    return false;
}

/**
 * 不需要翻译的设置项列表
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
    setTimeout(() => location.reload(), 100);
}
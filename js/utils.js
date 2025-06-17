/**
 * ComfyUI-DD-Translation 工具模块
 * 包含通用功能和工具函数
 */

// 调试模式开关
export const DEBUG_MODE = false;

// 翻译启用状态的本地存储键
export const TRANSLATION_ENABLED_KEY = "DD.TranslationEnabled";

// 翻译缓存的本地存储键
export const TRANSLATION_CACHE_KEY = "DD.TranslationCache";

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
 * @returns {boolean} 翻译是否启用
 */
export function isTranslationEnabled() {
    // 如果没有设置过，默认启用翻译
    return localStorage.getItem(TRANSLATION_ENABLED_KEY) !== "false";
}

/**
 * 切换翻译状态
 */
export function toggleTranslation() {
    const enabled = isTranslationEnabled();
    localStorage.setItem(TRANSLATION_ENABLED_KEY, enabled ? "false" : "true");
    setTimeout(() => {
        location.reload();
    }, 500);
}

/**
 * 性能计时开始
 * @returns {number} 开始时间戳
 */
export function startPerformanceTimer() {
    return performance.now();
}

/**
 * 性能计时结束并输出耗时
 * @param {string} operation 操作名称
 * @param {number} startTime 开始时间戳
 */
export function endPerformanceTimer(operation, startTime) {
    if (!startTime) return;
    const duration = performance.now() - startTime;
    log(`${operation} 耗时: ${duration.toFixed(2)}ms`);
}

/**
 * 从缓存获取翻译
 * @param {string} key 翻译键
 * @returns {string|null} 缓存的翻译或null
 */
export function getCachedTranslation(key) {
    try {
        const cachedTranslations = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
        return cachedTranslations[key] || null;
    } catch (e) {
        error("读取翻译缓存出错:", e);
        return null;
    }
}

/**
 * 将翻译存入缓存
 * @param {string} key 翻译键
 * @param {string} value 翻译值
 */
export function setCachedTranslation(key, value) {
    try {
        const cachedTranslations = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || '{}');
        cachedTranslations[key] = value;
        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cachedTranslations));
    } catch (e) {
        error("保存翻译缓存出错:", e);
    }
}
// ==UserScript==
// @name         Torn Gym Ratios (PDA Compatible)
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  Gym training helper with target percentages and current distribution display
// @author       Mistborn [3037268]
// @match        https://www.torn.com/gym.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=torn.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-end
// @license      MIT
// @downloadURL  https://github.com/MistbornTC/torn-gym-ratios/raw/main/torn-gym-ratios.user.js
// @updateURL    https://github.com/MistbornTC/torn-gym-ratios/raw/main/torn-gym-ratios.meta.js
// @supportURL   https://github.com/MistbornTC/torn-gym-ratios/issues
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== TORN GYM RATIOS SCRIPT LOADED ===');

    // Enhanced PDA detection
    function isTornPDA() {
        const userAgentCheck = navigator.userAgent.includes('com.manuito.tornpda');
        const flutterCheck = !!window.flutter_inappwebview;
        const platformCheck = !!window.__PDA_platformReadyPromise;
        const httpCheck = !!window.PDA_httpGet;

        const result = !!(userAgentCheck || flutterCheck || platformCheck || httpCheck);
        console.log('PDA Detection:', result, {
            userAgent: userAgentCheck,
            flutter: flutterCheck,
            platform: platformCheck,
            httpGet: httpCheck
        });
        return result;
    }

    // Universal storage functions
    function safeGM_getValue(key, defaultValue) {
        try {
            if (typeof GM_getValue !== 'undefined') {
                return GM_getValue(key, defaultValue);
            }
        } catch (e) {
            console.log('GM_getValue failed, using localStorage fallback');
        }

        try {
            const stored = localStorage.getItem('gym_' + key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (e) {
            console.log('localStorage failed, using default:', defaultValue);
            return defaultValue;
        }
    }

    function safeGM_setValue(key, value) {
        try {
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue(key, value);
                return;
            }
        } catch (e) {
            console.log('GM_setValue failed, using localStorage fallback');
        }

        try {
            localStorage.setItem('gym_' + key, JSON.stringify(value));
        } catch (e) {
            console.log('Storage failed');
        }
    }

    // Wait for element
    function waitForElement(selector, callback, timeout = 30000) {
        const startTime = Date.now();

        function check() {
            const element = document.querySelector(selector);
            if (element) {
                console.log('Found element:', selector);
                callback(element);
                return;
            }

            if (Date.now() - startTime > timeout) {
                console.error('Timeout waiting for element:', selector);
                return;
            }

            setTimeout(check, 100);
        }

        check();
    }

    // Extract current stat values
    function getCurrentStats() {
        const stats = { strength: 0, defense: 0, speed: 0, dexterity: 0 };

        const strengthContainer = document.querySelector('li[class*="strength___"]');
        const defenseContainer = document.querySelector('li[class*="defense___"]');
        const speedContainer = document.querySelector('li[class*="speed___"]');
        const dexterityContainer = document.querySelector('li[class*="dexterity___"]');

        function extractValue(container) {
            if (!container) return 0;

            const valueEl = container.querySelector('[class*="propertyValue___"]') ||
                           container.querySelector('.propertyValue') ||
                           container.querySelector('[data-value]');

            if (valueEl) {
                const text = valueEl.textContent || valueEl.getAttribute('data-value') || '0';
                return parseInt(text.replace(/,/g, '')) || 0;
            }
            return 0;
        }

        stats.strength = extractValue(strengthContainer);
        stats.defense = extractValue(defenseContainer);
        stats.speed = extractValue(speedContainer);
        stats.dexterity = extractValue(dexterityContainer);

        return stats;
    }

    // Calculate percentages
    function calculateCurrentDistribution(stats) {
        const total = stats.strength + stats.defense + stats.speed + stats.dexterity;
        if (total === 0) return { strength: 0, defense: 0, speed: 0, dexterity: 0 };

        return {
            strength: (stats.strength / total * 100).toFixed(1),
            defense: (stats.defense / total * 100).toFixed(1),
            speed: (stats.speed / total * 100).toFixed(1),
            dexterity: (stats.dexterity / total * 100).toFixed(1)
        };
    }

    // Load/save targets
    function loadTargets() {
        return {
            strength: safeGM_getValue('gym_target_strength', 25),
            defense: safeGM_getValue('gym_target_defense', 25),
            speed: safeGM_getValue('gym_target_speed', 25),
            dexterity: safeGM_getValue('gym_target_dexterity', 25)
        };
    }

    function saveTargets(targets) {
        safeGM_setValue('gym_target_strength', targets.strength);
        safeGM_setValue('gym_target_defense', targets.defense);
        safeGM_setValue('gym_target_speed', targets.speed);
        safeGM_setValue('gym_target_dexterity', targets.dexterity);
    }

    // Theme detection
    function getTheme() {
        const body = document.body;
        const isDarkMode = body.classList.contains('dark-mode') ||
                          body.classList.contains('dark') ||
                          body.style.background.includes('#191919') ||
                          getComputedStyle(body).backgroundColor === 'rgb(25, 25, 25)';

        return isDarkMode ? 'dark' : 'light';
    }

    function getThemeColors() {
        const theme = getTheme();

        if (theme === 'dark') {
            return {
                panelBg: '#2a2a2a',
                panelBorder: '#444',
                configBg: '#333',
                configBorder: '#555',
                statBoxBg: '#3a3a3a',
                statBoxBorder: '#444',
                statBoxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                inputBg: '#444',
                inputBorder: '#555',
                textPrimary: '#fff',
                textSecondary: '#ccc',
                textMuted: '#999',
                success: '#5cb85c',
                warning: '#f0ad4e',
                danger: '#d9534f',
                primary: '#4a90e2',
                neutral: '#666'
            };
        } else {
            return {
                panelBg: '#f8f9fa',
                panelBorder: 'rgba(102, 102, 102, 0.3)',
                configBg: '#ffffff',
                configBorder: '#ced4da',
                statBoxBg: '#ffffff',
                statBoxBorder: 'rgba(102, 102, 102, 0.3)',
                statBoxShadow: 'rgba(50, 50, 50, 0.2) 0px 0px 2px 0px',
                inputBg: '#ffffff',
                inputBorder: '#ced4da',
                textPrimary: '#212529',
                textSecondary: '#6c757d',
                textMuted: '#adb5bd',
                success: 'rgb(105, 168, 41)',
                warning: '#ffc107',
                danger: '#dc3545',
                primary: '#007bff',
                neutral: '#6c757d'
            };
        }
    }

    // Collapse state management
    function isCollapsed() {
        if (isTornPDA()) {
            const statsDisplay = document.getElementById('gym-stats-display');
            return statsDisplay ? statsDisplay.style.display === 'none' : false;
        }

        const isMobile = window.innerWidth <= 768;
        const key = isMobile ? 'gym_helper_collapsed_mobile' : 'gym_helper_collapsed_desktop';
        return safeGM_getValue(key, false);
    }

    function setCollapsed(collapsed) {
        if (isTornPDA()) {
            return; // No storage in PDA
        }

        const isMobile = window.innerWidth <= 768;
        const key = isMobile ? 'gym_helper_collapsed_mobile' : 'gym_helper_collapsed_desktop';
        safeGM_setValue(key, collapsed);
    }

    // Track current theme to detect changes
    let currentTheme = getTheme();

    // Dynamic theme update function
    function updateMainContainerTheme() {
        const newTheme = getTheme();
        if (newTheme !== currentTheme) {
            currentTheme = newTheme;
            const colors = getThemeColors();
            const mainPanel = document.getElementById('gym-helper-display');

            if (mainPanel) {
                mainPanel.style.background = colors.panelBg;
                mainPanel.style.border = '1px solid ' + colors.panelBorder;
                mainPanel.style.color = colors.textPrimary;
                mainPanel.style.boxShadow = colors.statBoxShadow;

                // Update title color
                const title = mainPanel.querySelector('#gym-header-clickable');
                if (title) title.style.color = colors.textPrimary;

                // Update button colors
                const helpBtn = document.getElementById('gym-help-btn');
                const collapseBtn = document.getElementById('gym-collapse-btn');
                const configBtn = document.getElementById('gym-config-btn');
                if (helpBtn) helpBtn.style.background = colors.neutral;
                if (collapseBtn) collapseBtn.style.background = colors.neutral;
                if (configBtn) configBtn.style.background = colors.primary;

                // Update help tooltip
                const tooltip = document.getElementById('gym-help-tooltip');
                if (tooltip) {
                    tooltip.style.background = colors.statBoxBg;
                    tooltip.style.border = '1px solid ' + colors.statBoxBorder;
                    tooltip.style.boxShadow = colors.statBoxShadow;

                    const tooltipElements = tooltip.querySelectorAll('div');
                    tooltipElements.forEach(el => {
                        el.style.color = colors.textPrimary;
                    });

                    // Update the Yellow/Orange text based on theme
                    const middleDiv = tooltip.children[2];
                    if (middleDiv) {
                        const newColorName = newTheme === 'light' ? 'Yellow' : 'Orange';
                        middleDiv.innerHTML = '<span style="color: ' + colors.warning + '; font-weight: bold; font-size: 16px;">|</span> <span style="font-weight: bold;">' + newColorName + ':</span> Above target (focus on other stats)';
                    }
                }

                // Update config panel
                const configPanel = document.getElementById('gym-config-panel');
                if (configPanel) {
                    configPanel.style.background = colors.configBg;
                    configPanel.style.border = '1px solid ' + colors.configBorder;

                    const configTitle = configPanel.querySelector('h4');
                    if (configTitle) configTitle.style.color = colors.textPrimary;

                    const configLabels = configPanel.querySelectorAll('label');
                    configLabels.forEach(label => {
                        label.style.color = colors.textSecondary;
                    });

                    const configInputs = configPanel.querySelectorAll('input');
                    configInputs.forEach(input => {
                        input.style.background = colors.inputBg;
                        input.style.border = '1px solid ' + colors.inputBorder;
                        input.style.color = colors.textPrimary;
                    });

                    const saveBtn = configPanel.querySelector('#save-targets');
                    const cancelBtn = configPanel.querySelector('#cancel-config');
                    if (saveBtn) saveBtn.style.background = colors.success;
                    if (cancelBtn) cancelBtn.style.background = colors.danger;
                }
            }
        }
    }

    // Create the main display panel using innerHTML (PDA-compatible)
    function createDisplayPanel() {
        const colors = getThemeColors();

        const panel = document.createElement('div');
        panel.id = 'gym-helper-display';
        panel.style.cssText = `
            background: ${colors.panelBg};
            border: 1px solid ${colors.panelBorder};
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: ${colors.textPrimary};
            position: relative;
            box-shadow: ${colors.statBoxShadow};
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 id="gym-header-clickable" style="
                    margin: 0;
                    color: ${colors.textPrimary};
                    font-size: 16px;
                    user-select: none;
                    cursor: pointer;
                ">Gym Ratios</h3>
                <div style="margin-left: auto; margin-right: -21px;">
                    <button id="gym-help-btn" style="
                        background: ${colors.neutral};
                        color: white;
                        border: none;
                        padding: 5px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                        margin-right: 5px;
                        ${(!isTornPDA() && window.innerWidth > 768) ? '-webkit-transform: translateZ(0); transform: translateZ(0); -webkit-backface-visibility: hidden; backface-visibility: hidden;' : 'outline: none; -webkit-appearance: none; appearance: none; border: none; position: relative; overflow: hidden;'}
                    ">&quest;</button>
                    <button id="gym-collapse-btn" style="
                        background: ${colors.neutral};
                        color: white;
                        border: none;
                        padding: 5px 8px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                        margin-right: 5px;
                        ${(!isTornPDA() && window.innerWidth > 768) ? '-webkit-transform: translateZ(0); transform: translateZ(0); -webkit-backface-visibility: hidden; backface-visibility: hidden;' : 'outline: none; -webkit-appearance: none; appearance: none; border: none; position: relative; overflow: hidden;'}
                    ">&minus;</button>
                    <button id="gym-config-btn" style="
                        background: ${colors.primary};
                        color: white;
                        border: none;
                        padding: 5px 10px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                        ${(!isTornPDA() && window.innerWidth > 768) ? '-webkit-transform: translateZ(0); transform: translateZ(0); -webkit-backface-visibility: hidden; backface-visibility: hidden;' : 'outline: none; -webkit-appearance: none; appearance: none; border: none; position: relative; overflow: hidden;'}
                    ">Config</button>
                </div>
            </div>
            <div id="gym-help-tooltip" style="
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: ${colors.statBoxBg};
                border: 1px solid ${colors.statBoxBorder};
                border-radius: 5px;
                padding: 12px;
                margin-top: 5px;
                z-index: 1001;
                display: none;
                box-shadow: ${colors.statBoxShadow};
                font-size: 13px;
                line-height: 1.4;
            ">
                <div style="margin-bottom: 8px; font-weight: bold; color: ${colors.textPrimary};">Color Guide:</div>
                <div style="margin-bottom: 6px; color: ${colors.textPrimary};">
                    <span style="color: ${colors.success}; font-weight: bold; font-size: 16px;">|</span> <span style="font-weight: bold;">Green:</span> On target (within &plusmn;1% of target)
                </div>
                <div style="margin-bottom: 6px; color: ${colors.textPrimary};">
                    <span style="color: ${colors.warning}; font-weight: bold; font-size: 16px;">|</span> <span style="font-weight: bold;">${getTheme() === 'light' ? 'Yellow' : 'Orange'}:</span> Above target (focus on other stats)
                </div>
                <div style="color: ${colors.textPrimary};">
                    <span style="color: ${colors.danger}; font-weight: bold; font-size: 16px;">|</span> <span style="font-weight: bold;">Red:</span> Below target (needs more training)
                </div>
            </div>
            <div id="gym-stats-display" style="
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
                font-size: 13px;
            "></div>
            <style>
                @media (max-width: 768px) {
                    #gym-stats-display {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 8px !important;
                        font-size: 12px !important;
                    }
                    #gym-helper-display {
                        padding: 10px !important;
                        margin: 5px 0 !important;
                    }
                }
                @media (max-width: 480px) {
                    #gym-stats-display {
                        grid-template-columns: repeat(2, 1fr) !important;
                        gap: 6px !important;
                        font-size: 11px !important;
                    }
                    #gym-helper-display {
                        margin-left: -5px !important;
                        position: relative !important;
                        z-index: 100 !important;
                    }
                    #gym-config-panel, #gym-help-tooltip {
                        left: 0 !important;
                        right: 0 !important;
                        margin-left: 0 !important;
                        margin-right: 0 !important;
                        z-index: 1010 !important;
                    }
                }
            </style>
        `;

        return panel;
    }

    // Create config panel using innerHTML (PDA-compatible) 
    function createConfigPanel() {
        const colors = getThemeColors();
        const targets = loadTargets();

        const configPanel = document.createElement('div');
        configPanel.id = 'gym-config-panel';
        configPanel.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: ${colors.configBg};
            border: 1px solid ${colors.configBorder};
            border-radius: 5px;
            padding: 15px;
            margin-top: 5px;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        `;

        configPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 15px;">
                <h4 style="margin: 0; padding: 0; color: ${colors.textPrimary}; font-size: 16px;">Target Percentages</h4>
                <span id="total-percentage" style="margin: 0; padding: 0; color: ${colors.textSecondary}; font-weight: bold; font-size: 12px;">Total: 100%</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
                <div>
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary};">Strength (%)</label>
                    <input type="number" id="target-strength" value="${targets.strength}" min="0" max="100" step="0.1" style="
                        width: 100%;
                        padding: 5px;
                        border: 1px solid ${colors.inputBorder};
                        border-radius: 3px;
                        background: ${colors.inputBg};
                        color: ${colors.textPrimary};
                        box-sizing: border-box;
                    ">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary};">Defense (%)</label>
                    <input type="number" id="target-defense" value="${targets.defense}" min="0" max="100" step="0.1" style="
                        width: 100%;
                        padding: 5px;
                        border: 1px solid ${colors.inputBorder};
                        border-radius: 3px;
                        background: ${colors.inputBg};
                        color: ${colors.textPrimary};
                        box-sizing: border-box;
                    ">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary};">Speed (%)</label>
                    <input type="number" id="target-speed" value="${targets.speed}" min="0" max="100" step="0.1" style="
                        width: 100%;
                        padding: 5px;
                        border: 1px solid ${colors.inputBorder};
                        border-radius: 3px;
                        background: ${colors.inputBg};
                        color: ${colors.textPrimary};
                        box-sizing: border-box;
                    ">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 5px; color: ${colors.textSecondary};">Dexterity (%)</label>
                    <input type="number" id="target-dexterity" value="${targets.dexterity}" min="0" max="100" step="0.1" style="
                        width: 100%;
                        padding: 5px;
                        border: 1px solid ${colors.inputBorder};
                        border-radius: 3px;
                        background: ${colors.inputBg};
                        color: ${colors.textPrimary};
                        box-sizing: border-box;
                    ">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                <button id="save-targets" style="
                    background: ${colors.success};
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    width: 100%;
                    box-sizing: border-box;
                ">Save</button>
                <button id="cancel-config" style="
                    background: ${colors.danger};
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 12px;
                    width: 100%;
                    box-sizing: border-box;
                ">Cancel</button>
            </div>
        `;

        return configPanel;
    }

    // Toggle collapse state
    function toggleCollapsed() {
        const statsDisplay = document.getElementById('gym-stats-display');
        const collapseBtn = document.getElementById('gym-collapse-btn');
        const configPanel = document.getElementById('gym-config-panel');
        const mainPanel = document.getElementById('gym-helper-display');
        const header = mainPanel ? mainPanel.querySelector('div:first-child') : null;

        if (!statsDisplay || !collapseBtn) return;

        const collapsed = isCollapsed();
        const newState = !collapsed;

        setCollapsed(newState);

        if (newState) {
            // Collapse
            statsDisplay.style.display = 'none';
            collapseBtn.innerHTML = '+';
            if (configPanel) configPanel.style.display = 'none';

            // Adjust spacing when collapsed for tighter layout
            if (header) header.style.marginBottom = '2px';
            if (mainPanel) {
                if (isTornPDA()) {
                    mainPanel.style.padding = '10px 15px 8px 15px';
                    mainPanel.style.marginBottom = '5px';
                } else {
                    mainPanel.style.padding = '10px 15px 8px 15px';
                }
            }
        } else {
            // Expand
            statsDisplay.style.display = 'grid';
            collapseBtn.innerHTML = '&minus;';

            // Restore normal spacing when expanded
            if (header) header.style.marginBottom = '10px';
            if (mainPanel) {
                if (isTornPDA()) {
                    mainPanel.style.padding = '15px';
                    mainPanel.style.marginBottom = '10px';
                } else {
                    mainPanel.style.padding = '15px';
                }
            }
            updateStats();
        }
    }

    // Apply saved collapse state
    function applySavedCollapseState() {
        if (isTornPDA()) {
            return; // Always start expanded in PDA
        }

        if (isCollapsed()) {
            setTimeout(() => {
                const statsDisplay = document.getElementById('gym-stats-display');
                const collapseBtn = document.getElementById('gym-collapse-btn');

                if (statsDisplay && collapseBtn) {
                    statsDisplay.style.display = 'none';
                    collapseBtn.innerHTML = '+';
                    const mainPanel = document.getElementById('gym-helper-display');
                    if (mainPanel) mainPanel.style.paddingBottom = '5px';
                }
            }, 100);
        }
    }

    // Update stats display
    function updateStats() {
        updateMainContainerTheme(); // Check for theme changes

        const stats = getCurrentStats();
        const dist = calculateCurrentDistribution(stats);
        const targets = loadTargets();
        const colors = getThemeColors();

        const statsDiv = document.getElementById('gym-stats-display');
        if (!statsDiv) return;

        if (isCollapsed()) return; // Don't update if collapsed

        const total = stats.strength + stats.defense + stats.speed + stats.dexterity;
        if (total === 0) {
            statsDiv.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: ' + colors.textSecondary + ';">No stats found. Make sure you\'re on the gym page.</div>';
            return;
        }

        const statNames = ['strength', 'defense', 'speed', 'dexterity'];
        const statLabels = ['Strength', 'Defense', 'Speed', 'Dexterity'];

        statsDiv.innerHTML = statNames.map((stat, index) => {
            const current = parseFloat(dist[stat]);
            const target = targets[stat];
            const diff = current - target;
            const color = Math.abs(diff) <= 1 ? colors.success : (diff > 0 ? colors.warning : colors.danger);

            return `
                <div style="
                    background: ${colors.statBoxBg};
                    padding: 10px;
                    border-radius: 3px;
                    text-align: center;
                    border-left: 3px solid ${color};
                    border-top: 1px solid ${colors.statBoxBorder};
                    border-right: 1px solid ${colors.statBoxBorder};
                    border-bottom: 1px solid ${colors.statBoxBorder};
                    box-shadow: ${colors.statBoxShadow};
                ">
                    <div style="font-weight: bold; margin-bottom: 5px; color: ${colors.textPrimary};">${statLabels[index]}</div>
                    <div style="color: ${color}; font-weight: bold; margin-bottom: 4px;">
                        ${current}% (${diff > 0 ? '+' : ''}${diff.toFixed(1)})
                    </div>
                    <div style="font-size: 10px; color: ${colors.textMuted};">
                        Target: ${target}%
                    </div>
                </div>
            `;
        }).join('');

        console.log('Stats updated');
    }

    // Update total percentage in config
    function updateTotalPercentage() {
        const strength = parseFloat(document.getElementById('target-strength').value) || 0;
        const defense = parseFloat(document.getElementById('target-defense').value) || 0;
        const speed = parseFloat(document.getElementById('target-speed').value) || 0;
        const dexterity = parseFloat(document.getElementById('target-dexterity').value) || 0;

        const total = strength + defense + speed + dexterity;
        const totalSpan = document.getElementById('total-percentage');
        const colors = getThemeColors();

        if (totalSpan) {
            totalSpan.textContent = 'Total: ' + total.toFixed(1) + '%';
            totalSpan.style.color = Math.abs(total - 100) <= 0.1 ? colors.success : colors.danger;
        }

        const saveBtn = document.getElementById('save-targets');
        if (saveBtn) {
            saveBtn.disabled = Math.abs(total - 100) > 0.1;
            saveBtn.style.opacity = saveBtn.disabled ? '0.5' : '1';
        }
    }

    // SPEED OPTIMIZED INITIALIZATION
    function initOptimized() {
        console.log('=== INITIALIZING PDA-FIXED SPEED OPTIMIZED SCRIPT ===');
        console.log('Platform:', isTornPDA() ? 'PDA' : 'Browser');
        console.log('URL:', window.location.href);

        if (isTornPDA()) {
            console.log('Using PDA-compatible (slower) initialization method');
            waitForElement('.page-head-delimiter', function(delimiter) {
                console.log('Found page delimiter, creating panel');

                const displayPanel = createDisplayPanel();
                const configPanel = createConfigPanel();

                displayPanel.appendChild(configPanel);
                delimiter.parentNode.insertBefore(displayPanel, delimiter.nextSibling);

                console.log('Panel inserted, waiting for stats to load');

                setTimeout(function() {
                    updateStats();
                    applySavedCollapseState();
                    setInterval(updateStats, 5000);
                }, 2000);

                setupEventListeners();

            }, 15000);
        } else {
            console.log('Using browser-optimized (faster) initialization method');
            waitForElement('li[class*="strength___"]', function(strengthEl) {
                console.log('Found strength element, checking for delimiter');

                const delimiter = document.querySelector('.page-head-delimiter');
                if (!delimiter) {
                    console.log('Delimiter not found, retrying in 100ms');
                    setTimeout(initOptimized, 100);
                    return;
                }

                console.log('Both stats and delimiter found, creating panel');

                const displayPanel = createDisplayPanel();
                const configPanel = createConfigPanel();

                displayPanel.appendChild(configPanel);
                delimiter.parentNode.insertBefore(displayPanel, delimiter.nextSibling);

                console.log('Panel inserted, updating stats');

                updateStats();
                applySavedCollapseState();
                setInterval(updateStats, 5000);

                setupEventListeners();

            }, 5000);
        }
    }

    // Setup event listeners
    function setupEventListeners() {
        // Help button
        document.getElementById('gym-help-btn').addEventListener('click', () => {
            const tooltip = document.getElementById('gym-help-tooltip');
            tooltip.style.display = tooltip.style.display === 'none' ? 'block' : 'none';
            const configPanel = document.getElementById('gym-config-panel');
            if (tooltip.style.display === 'block') configPanel.style.display = 'none';
        });

        // Header click and collapse button
        document.getElementById('gym-header-clickable').addEventListener('click', toggleCollapsed);
        document.getElementById('gym-collapse-btn').addEventListener('click', toggleCollapsed);

        // Config button
        document.getElementById('gym-config-btn').addEventListener('click', () => {
            if (isCollapsed()) {
                toggleCollapsed();
                setTimeout(() => {
                    const panel = document.getElementById('gym-config-panel');
                    if (panel) panel.style.display = 'block';
                }, 100);
            } else {
                const panel = document.getElementById('gym-config-panel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                    const tooltip = document.getElementById('gym-help-tooltip');
                    if (panel.style.display === 'block') tooltip.style.display = 'none';
                }
            }
        });

        // Config panel buttons
        document.getElementById('cancel-config').addEventListener('click', () => {
            document.getElementById('gym-config-panel').style.display = 'none';
        });

        document.getElementById('save-targets').addEventListener('click', () => {
            const targets = {
                strength: parseFloat(document.getElementById('target-strength').value),
                defense: parseFloat(document.getElementById('target-defense').value),
                speed: parseFloat(document.getElementById('target-speed').value),
                dexterity: parseFloat(document.getElementById('target-dexterity').value)
            };

            saveTargets(targets);
            updateStats();
            document.getElementById('gym-config-panel').style.display = 'none';
        });

        // Add input listeners for real-time validation
        ['target-strength', 'target-defense', 'target-speed', 'target-dexterity'].forEach(id => {
            document.getElementById(id).addEventListener('input', updateTotalPercentage);
        });

        // Initial total percentage update
        updateTotalPercentage();

        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            const helpBtn = document.getElementById('gym-help-btn');
            const tooltip = document.getElementById('gym-help-tooltip');
            const configBtn = document.getElementById('gym-config-btn');
            const configPanel = document.getElementById('gym-config-panel');

            if (!helpBtn.contains(e.target) && !tooltip.contains(e.target)) {
                tooltip.style.display = 'none';
            }

            if (!configBtn.contains(e.target) && !configPanel.contains(e.target)) {
                configPanel.style.display = 'none';
            }
        });
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOptimized);
    } else {
        initOptimized();
    }

})();

"use strict";

// =========================================================
// MITRA BHUM V.2654N - AI BERTH MONITORING SIMULATION
// Data and timing follow the TDR-based scenario in Chapter 3.
// Requires Plotly, ExcelJS and FileSaver to be loaded in index.html.
// =========================================================

let simulationStarted = false;
let simulationTimer = null;
let currentMinute = 0;
let activeAlert = null;
let waitingForConfirmation = false;

const TOTAL_MINUTES = 340;
const TOTAL_CONTAINERS = 232;

const LOAD_START_MINUTE = 38;
const LOAD_FINISH_MINUTE = 234;

const STEP_MINUTES = 5;
const TIMER_INTERVAL_MS = 1000;

const vesselData = {
    vessel: "MITRA BHUM",
    voyage: "2654N",
    berth: "B02",
    operationDate: "25/10/2026",
    atb: "02:50",
    loadingStart: "03:28",
    loadingFinish: "06:44",
    atd: "08:30",
    containers: {
        empty: 109,
        full: 123,
        total: 232
    },
    finalKpi: {
        portStayHours: 5.67,
        workingHours: 3.25,
        berthProductivity: 40.9,
        cargoProductivity: 71.3,
        synchronizationFactor: 0.57,
        craneRatio: 2.55,
        beforeLoadingRatio: 11.4,
        workingRatio: 57.4,
        afterLoadingRatio: 31.2
    }
};

const CRANES = [
    {
        key: "crane1",
        name: "Cẩu 1",
        exportName: "Crane 1",
        bay: "06, 02",
        target: 55,
        startMinute: 38,
        finishMinute: 160,
        productivity: 27.05,
        predictedFinish: "05:30"
    },
    {
        key: "crane2",
        name: "Cẩu 2",
        exportName: "Crane 2",
        bay: "20",
        target: 91,
        startMinute: 38,
        finishMinute: 234,
        productivity: 27.86,
        predictedFinish: "06:44"
    },
    {
        key: "crane3",
        name: "Cẩu 3",
        exportName: "Crane 3",
        bay: "30",
        target: 86,
        startMinute: 38,
        finishMinute: 228,
        productivity: 27.16,
        predictedFinish: "06:38"
    }
];

const SYSTEM_LOGS = [
    {
        minute: 0,
        time: "02:50",
        type: "AI",
        message: "Nhận diện tàu MITRA BHUM cập cầu B02",
        detail: "Ghi nhận ATB = 02:50."
    },
    {
        minute: 1,
        time: "02:50",
        type: "TDR",
        message: "Khởi tạo bản nháp TDR",
        detail: "Tạo hồ sơ chuyến tàu và bắt đầu theo dõi."
    },
    {
        minute: 38,
        time: "03:28",
        type: "AI",
        message: "Ba cẩu bắt đầu làm hàng",
        detail: "Ghi nhận Start Load = 03:28 và bắt đầu đếm lượt nâng hạ."
    },
    {
        minute: 39,
        time: "03:28",
        type: "TDR",
        message: "Cập nhật Start Load",
        detail: "Mốc bắt đầu làm hàng đã được lưu vào bản nháp TDR."
    },
    {
        minute: 55,
        time: "03:45",
        type: "AI",
        message: "Cẩu 1 đạt mốc sản lượng",
        detail: "Sản lượng nội suy đạt khoảng 7/55 container."
    },
    {
        minute: 70,
        time: "04:00",
        type: "AI",
        message: "Theo dõi tiến độ ba cẩu",
        detail: "Hệ thống tiếp tục nội suy sản lượng theo giờ bắt đầu và giờ hoàn thành từng cẩu."
    },
    {
        minute: 95,
        time: "04:25",
        type: "AI",
        message: "Cẩu 1 tiếp tục làm hàng",
        detail: "Tiến độ được cập nhật theo năng suất thực tế của cẩu."
    },
    {
        minute: 120,
        time: "04:50",
        type: "AI",
        message: "Đánh giá tiến độ giữa ca",
        detail: "Sản lượng ba cẩu được tổng hợp và so sánh với kế hoạch."
    },
    {
        minute: 150,
        time: "05:20",
        type: "AI",
        message: "Cẩu 1 sắp hoàn thành",
        detail: "Dự báo hoàn thành lúc 05:30."
    },
    {
        minute: 160,
        time: "05:30",
        type: "AI",
        message: "Cẩu 1 hoàn thành",
        detail: "Đạt 55/55 container."
    },
    {
        minute: 161,
        time: "05:30",
        type: "TDR",
        message: "Cập nhật hoàn thành Cẩu 1",
        detail: "Ghi nhận giờ hoàn thành 05:30."
    },
    {
        minute: 200,
        time: "06:10",
        type: "AI",
        message: "Theo dõi Cẩu 2 và Cẩu 3",
        detail: "Cẩu 2 và Cẩu 3 tiếp tục làm hàng; Cẩu 1 đã hoàn thành."
    },
    {
        minute: 228,
        time: "06:38",
        type: "AI",
        message: "Cẩu 3 hoàn thành",
        detail: "Đạt 86/86 container."
    },
    {
        minute: 229,
        time: "06:38",
        type: "TDR",
        message: "Cập nhật hoàn thành Cẩu 3",
        detail: "Ghi nhận giờ hoàn thành 06:38."
    },
    {
        minute: 234,
        time: "06:44",
        type: "AI",
        message: "Cẩu 2 hoàn thành và kết thúc làm hàng",
        detail: "Cẩu 2 đạt 91/91 container; tổng sản lượng đạt 232 container."
    },
    {
        minute: 235,
        time: "06:44",
        type: "TDR",
        message: "Cập nhật Finish Load",
        detail: "Ghi nhận Finish Load = 06:44."
    },
    {
        minute: 340,
        time: "08:30",
        type: "AI",
        message: "Nhận diện tàu rời cầu",
        detail: "Ghi nhận ATD = 08:30."
    },
    {
        minute: 340,
        time: "08:30",
        type: "TDR",
        message: "Đóng hồ sơ chuyến tàu",
        detail: "Hoàn tất KPI và báo cáo cuối chuyến."
    }
];

const ALERTS = [
    {
        id: "pre-loading",
        minute: 10,
        time: "03:00",
        stage: "TRƯỚC KHI LÀM HÀNG",
        title: "Khoảng dừng trước khi làm hàng",
        description: "Sau 10 phút kể từ ATB, hệ thống chưa ghi nhận lượt nâng hạ.",
        multiple: true,
        confirmer: "ĐĐHT",
        options: [
            "Buộc dây, hạ cầu thang",
            "Thủ tục nhập cảnh",
            "Tháo chằng buộc, mở nắp hầm",
            "Chờ công nhân, thiết bị",
            "Khác"
        ]
    },
    {
        id: "crane-balance",
        minute: 68,
        time: "03:58",
        stage: "TRONG KHI LÀM HÀNG",
        title: "Mất cân đối tải giữa các cẩu",
        description: "Dự báo Cẩu 1 xong 05:30, Cẩu 2 xong 06:44, chênh lệch 74 phút.",
        multiple: false,
        confirmer: "Planner",
        options: [
            "Điều Cẩu 1 sang hỗ trợ sau khi hoàn thành",
            "Giữ nguyên kế hoạch"
        ]
    },
    {
        id: "post-loading",
        minute: 244,
        time: "06:54",
        stage: "SAU KHI LÀM HÀNG",
        title: "Khoảng dừng sau khi làm hàng",
        description: "Sau 10 phút kể từ Finish Load, tàu vẫn chưa rời cầu.",
        multiple: true,
        confirmer: "Planner",
        options: [
            "Chằng buộc",
            "Đóng nắp hầm",
            "Ký sơ đồ xếp hàng với đại phó",
            "Chờ giấy phép rời cảng",
            "Chờ hoa tiêu, con nước",
            "Khác"
        ]
    }
];

const KEY_MINUTES = [10, 38, 68, 160, 228, 234, 244, 340];
const confirmedAlerts = new Map();
const emittedLogIndexes = new Set();
const alertHistory = [];

// =========================================================
// Helpers
// =========================================================

function getElement(id) {
    return document.getElementById(id);
}

function formatSimulationTime(minuteOffset) {
    const absoluteMinutes = (2 * 60) + 50 + minuteOffset;
    const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, "0");
    const minutes = String(absoluteMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function calculateCraneLoaded(crane, minute = currentMinute) {
    if (minute < crane.startMinute) return 0;
    if (minute >= crane.finishMinute) return crane.target;

    const ratio =
        (minute - crane.startMinute) /
        (crane.finishMinute - crane.startMinute);

    return Math.min(
        crane.target,
        Math.floor(crane.target * ratio)
    );
}

function calculateTotalAtMinute(minute) {
    return CRANES.reduce(
        (sum, crane) => sum + calculateCraneLoaded(crane, minute),
        0
    );
}

function getCraneValue(craneKey, minute = currentMinute) {
    const crane = CRANES.find(item => item.key === craneKey);
    return crane ? calculateCraneLoaded(crane, minute) : 0;
}

function getCurrentState(minute = currentMinute) {
    const crane1 = getCraneValue("crane1", minute);
    const crane2 = getCraneValue("crane2", minute);
    const crane3 = getCraneValue("crane3", minute);
    const totalLoaded = crane1 + crane2 + crane3;

    const emptyLoaded = Math.floor(
        totalLoaded * vesselData.containers.empty /
        vesselData.containers.total
    );

    const fullLoaded = totalLoaded - emptyLoaded;

    return {
        minute,
        time: formatSimulationTime(minute),
        progress: totalLoaded / TOTAL_CONTAINERS,
        crane1,
        crane2,
        crane3,
        totalLoaded,
        emptyLoaded,
        fullLoaded
    };
}

function getContainerMix() {
    const state = getCurrentState();
    return {
        empty: state.emptyLoaded,
        full: state.fullLoaded
    };
}

function updateClock() {
    const clock = getElement("clock");
    if (clock) clock.innerText = formatSimulationTime(currentMinute);
}

function pauseSimulation() {
    if (simulationTimer) {
        clearInterval(simulationTimer);
        simulationTimer = null;
    }

    const playButton = getElement("playButton");
    if (playButton) playButton.innerText = "▶ Chạy";
}

// =========================================================
// Dashboard and charts
// =========================================================

function updateDashboard() {
    const state = getCurrentState();
    const completion = state.progress * 100;

    const completionValue = getElement("completionValue");
    if (completionValue) {
        completionValue.innerText = `${completion.toFixed(1)}%`;
    }

    const totalValue = getElement("totalValue");
    if (totalValue) totalValue.innerText = `${state.totalLoaded}/${TOTAL_CONTAINERS}`;

    const emptyValue = getElement("emptyValue");
    if (emptyValue) emptyValue.innerText = `${state.emptyLoaded}/${vesselData.containers.empty}`;

    const fullValue = getElement("fullValue");
    if (fullValue) fullValue.innerText = `${state.fullLoaded}/${vesselData.containers.full}`;

    CRANES.forEach((crane, index) => {
        const value = calculateCraneLoaded(crane);
        const percent = value / crane.target * 100;
        const bar = getElement(`crane${index + 1}`);
        const info = getElement(`crane${index + 1}Info`);

        if (bar) bar.style.width = `${percent}%`;

        if (info) {
            info.innerText =
                `${value}/${crane.target} cont | ` +
                `${crane.productivity.toFixed(2)} cont/giờ | ` +
                `Dự báo xong ${crane.predictedFinish}`;
        }
    });

    updateClock();

    if (simulationStarted) renderCharts();
}

function renderCharts() {
    if (typeof Plotly === "undefined") return;

    const state = getCurrentState();

    Plotly.react(
        "craneChart",
        [{
            x: CRANES.map(crane => crane.name),
            y: [state.crane1, state.crane2, state.crane3],
            text: CRANES.map((crane, index) => {
                const values = [state.crane1, state.crane2, state.crane3];
                return `${values[index]}/${crane.target}`;
            }),
            textposition: "outside",
            type: "bar",
            marker: {
                color: ["#3498db", "#f39c12", "#2ecc71"]
            }
        }],
        {
            title: "Tiến độ sản lượng từng cẩu",
            yaxis: { title: "Container", range: [0, 100] },
            margin: { t: 55, r: 20, b: 45, l: 55 }
        },
        { responsive: true, displaylogo: false }
    );

    Plotly.react(
        "containerChart",
        [{
            values: [state.emptyLoaded, state.fullLoaded],
            labels: ["Rỗng", "Đầy"],
            type: "pie",
            hole: 0.55,
            textinfo: "label+value+percent",
            marker: { colors: ["#2ecc71", "#f39c12"] }
        }],
        {
            title: "Cơ cấu container đã xếp",
            annotations: [{
                text: `${state.totalLoaded}/${TOTAL_CONTAINERS}`,
                showarrow: false,
                font: { size: 18 }
            }]
        },
        { responsive: true, displaylogo: false }
    );

    const timelineX = [];
    const timelineY = [];

    for (let minute = 0; minute <= currentMinute; minute += 5) {
        timelineX.push(minute);
        timelineY.push(calculateTotalAtMinute(minute));
    }

    const visibleLogs = SYSTEM_LOGS.filter(log => log.minute <= currentMinute);
    const visibleAlerts = ALERTS.filter(alert => alert.minute <= currentMinute);

    Plotly.react(
        "timelineChart",
        [
            {
                x: timelineX,
                y: timelineY,
                mode: "lines",
                name: "Sản lượng",
                line: { color: "#4da3ff", width: 3 }
            },
            {
                x: visibleLogs.map(log => log.minute),
                y: visibleLogs.map(log => calculateTotalAtMinute(log.minute)),
                mode: "markers",
                name: "Sự kiện",
                text: visibleLogs.map(
                    log => `${log.time}<br>${log.message}<br>${log.detail}`
                ),
                hoverinfo: "text",
                marker: { size: 8, color: "#ffb300" }
            },
            {
                x: visibleAlerts.map(alert => alert.minute),
                y: visibleAlerts.map(alert => calculateTotalAtMinute(alert.minute)),
                mode: "markers",
                name: "Cảnh báo",
                text: visibleAlerts.map(
                    alert => `${alert.time}<br>${alert.title}<br>${alert.description}`
                ),
                hoverinfo: "text",
                marker: { size: 12, color: "#e53935", symbol: "diamond" }
            }
        ],
        {
            title: "Diễn biến sản lượng và sự kiện",
            xaxis: { title: "Phút mô phỏng", range: [0, TOTAL_MINUTES] },
            yaxis: { title: "Container", range: [0, TOTAL_CONTAINERS] },
            margin: { t: 55, r: 20, b: 55, l: 60 }
        },
        { responsive: true, displaylogo: false }
    );
}

// =========================================================
// Logs
// =========================================================

function addLog(time, type, message) {
    const logList = getElement("logList");
    if (!logList) return;

    const log = document.createElement("div");
    log.className = "log-item";

    let tagClass = "tag-ai";
    if (type === "TDR") tagClass = "tag-tdr";
    if (type === "NHÂN VIÊN") tagClass = "tag-human";
    if (type === "CẢNH BÁO") tagClass = "tag-alert";

    const parts = message.split("<br>");

    log.innerHTML = `
        <div class="log-time">${time}</div>
        <div class="log-tag ${tagClass}">${type}</div>
        <div class="log-content">
            <div class="log-title">${parts[0] || ""}</div>
            <div class="log-detail">${parts.slice(1).join(" ")}</div>
        </div>
    `;

    logList.prepend(log);

    const counter = getElement("logCounter");
    if (counter) {
        counter.innerText = `${logList.querySelectorAll(".log-item").length} sự kiện`;
    }
}

function emitLogsBetween(previousMinute, nextMinute) {
    SYSTEM_LOGS.forEach((log, index) => {
        if (
            !emittedLogIndexes.has(index) &&
            previousMinute < log.minute &&
            log.minute <= nextMinute
        ) {
            addLog(log.time, log.type, `${log.message}<br>${log.detail}`);
            emittedLogIndexes.add(index);

            alertHistory.push({
                time: log.time,
                type: log.type,
                message: log.message,
                detail: log.detail
            });
        }
    });
}

// =========================================================
// Alert confirmation UI
// =========================================================

function ensureAlertConfirmationPanel() {
    if (getElement("alertConfirmationPanel")) return;

    const panel = document.createElement("section");
    panel.id = "alertConfirmationPanel";
    panel.className = "alert-confirmation hidden";
    panel.innerHTML = `
        <div class="alert-confirmation__header">
            <div>
                <span id="alertStage" class="alert-stage"></span>
                <h2 id="alertTitle">Cảnh báo</h2>
            </div>
            <span id="alertTime" class="alert-time"></span>
        </div>
        <p id="alertDescription" class="alert-description"></p>
        <div id="alertOptions" class="alert-options"></div>
        <label class="confirmation-field">
            <span>Người xác nhận</span>
            <input id="alertConfirmer" type="text" readonly>
        </label>
        <label class="confirmation-field">
            <span>Ghi chú bổ sung</span>
            <textarea id="alertNote" rows="3" placeholder="Nhập ghi chú nếu cần"></textarea>
        </label>
        <p id="alertValidation" class="alert-validation"></p>
        <button id="confirmAlertButton" type="button">
            Xác nhận và tiếp tục
        </button>
    `;

    const host = getElement("alertBox") || getElement("chartsSection") || document.body;
    host.parentNode.insertBefore(panel, host.nextSibling);

    getElement("confirmAlertButton").addEventListener("click", confirmActiveAlert);
}

function findAlertBetween(previousMinute, nextMinute) {
    return ALERTS.find(alert =>
        !confirmedAlerts.has(alert.id) &&
        previousMinute < alert.minute &&
        alert.minute <= nextMinute
    );
}

function showAlertConfirmation(alert) {
    ensureAlertConfirmationPanel();

    activeAlert = alert;
    waitingForConfirmation = true;
    pauseSimulation();

    document.body.classList.add("waiting-confirmation");

    const panel = getElement("alertConfirmationPanel");
    panel.classList.remove("hidden");

    getElement("alertStage").innerText = alert.stage;
    getElement("alertTitle").innerText = alert.title;
    getElement("alertTime").innerText = alert.time;
    getElement("alertDescription").innerText = alert.description;
    getElement("alertConfirmer").value = alert.confirmer;
    getElement("alertNote").value = "";
    getElement("alertValidation").innerText = "";

    const optionsContainer = getElement("alertOptions");
    optionsContainer.innerHTML = "";

    alert.options.forEach((option, index) => {
        const label = document.createElement("label");
        label.className = "alert-option";

        const input = document.createElement("input");
        input.type = alert.multiple ? "checkbox" : "radio";
        input.name = `alert-${alert.id}`;
        input.value = option;
        input.id = `alert-${alert.id}-${index}`;

        const text = document.createElement("span");
        text.innerText = option;

        label.appendChild(input);
        label.appendChild(text);
        optionsContainer.appendChild(label);
    });

    addLog(alert.time, "CẢNH BÁO", `${alert.title}<br>${alert.description}`);

    alertHistory.push({
        time: alert.time,
        type: "CẢNH BÁO",
        message: alert.title,
        detail: alert.description
    });

    panel.scrollIntoView({ behavior: "smooth", block: "center" });
}

function getSelectedAlertOptions() {
    if (!activeAlert) return [];

    return Array.from(
        document.querySelectorAll(
            `input[name="alert-${activeAlert.id}"]:checked`
        )
    ).map(input => input.value);
}

function confirmActiveAlert() {
    if (!activeAlert) return;

    const selectedOptions = getSelectedAlertOptions();
    const validation = getElement("alertValidation");

    if (selectedOptions.length === 0) {
        validation.innerText =
            "Vui lòng chọn ít nhất một nguyên nhân hoặc phương án xử lý.";
        return;
    }

    const note = getElement("alertNote").value.trim();
    const confirmedAlert = activeAlert;

    const confirmation = {
        id: confirmedAlert.id,
        minute: confirmedAlert.minute,
        time: confirmedAlert.time,
        stage: confirmedAlert.stage,
        title: confirmedAlert.title,
        confirmer: confirmedAlert.confirmer,
        selections: selectedOptions,
        note
    };

    confirmedAlerts.set(confirmedAlert.id, confirmation);

    addLog(
        confirmedAlert.time,
        "NHÂN VIÊN",
        `Đã xác nhận: ${selectedOptions.join("; ")}<br>` +
        `${confirmedAlert.confirmer}` +
        (note ? ` | Ghi chú: ${note}` : "")
    );

    alertHistory.push({
        time: confirmedAlert.time,
        type: "NHÂN VIÊN",
        message: confirmedAlert.title,
        detail:
            `${selectedOptions.join("; ")} | ` +
            `Xác nhận: ${confirmedAlert.confirmer}` +
            (note ? ` | ${note}` : "")
    });

    addLog(
        confirmedAlert.time,
        "TDR",
        `Đã lưu xác nhận vào bản nháp TDR<br>${selectedOptions.join("; ")}`
    );

    alertHistory.push({
        time: confirmedAlert.time,
        type: "TDR",
        message: "Lưu xác nhận vào bản nháp TDR",
        detail: selectedOptions.join("; ")
    });

    getElement("alertConfirmationPanel").classList.add("hidden");
    document.body.classList.remove("waiting-confirmation");

    activeAlert = null;
    waitingForConfirmation = false;
    updateDashboard();

    // Nút ghi "Xác nhận và tiếp tục", nên tự chạy tiếp sau khi xác nhận.
    window.setTimeout(playSimulation, 200);
}

// =========================================================
// Simulation controls
// =========================================================

function playSimulation() {
    if (waitingForConfirmation) {
        getElement("alertConfirmationPanel").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
        return;
    }

    if (!simulationStarted) {
        simulationStarted = true;
        const chartsSection = getElement("chartsSection");
        if (chartsSection) chartsSection.style.display = "block";
        renderCharts();
    }

    if (simulationTimer) {
        pauseSimulation();
        return;
    }

    const playButton = getElement("playButton");
    if (playButton) playButton.innerText = "⏸ Tạm dừng";

    simulationTimer = setInterval(() => {
        const previousMinute = currentMinute;
        const requestedMinute = Math.min(
            currentMinute + STEP_MINUTES,
            TOTAL_MINUTES
        );

        const alert = findAlertBetween(previousMinute, requestedMinute);

        if (alert) {
            emitLogsBetween(previousMinute, alert.minute);
            currentMinute = alert.minute;
            updateDashboard();
            showAlertConfirmation(alert);
            return;
        }

        emitLogsBetween(previousMinute, requestedMinute);
        currentMinute = requestedMinute;
        updateDashboard();

        if (currentMinute >= TOTAL_MINUTES) {
            pauseSimulation();
        }
    }, TIMER_INTERVAL_MS);
}

function nextEvent() {
    if (waitingForConfirmation) {
        getElement("alertConfirmationPanel").scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
        return;
    }

    const nextMinute = KEY_MINUTES.find(minute => minute > currentMinute);
    if (nextMinute === undefined) return;

    if (!simulationStarted) {
        simulationStarted = true;
        const chartsSection = getElement("chartsSection");
        if (chartsSection) chartsSection.style.display = "block";
    }

    const previousMinute = currentMinute;
    const alert = findAlertBetween(previousMinute, nextMinute);

    if (alert) {
        emitLogsBetween(previousMinute, alert.minute);
        currentMinute = alert.minute;
        updateDashboard();
        showAlertConfirmation(alert);
        return;
    }

    currentMinute = nextMinute;
    emitLogsBetween(previousMinute, currentMinute);
    updateDashboard();
}

function resetSimulation() {
    pauseSimulation();

    currentMinute = 0;
    simulationStarted = false;
    activeAlert = null;
    waitingForConfirmation = false;

    confirmedAlerts.clear();
    emittedLogIndexes.clear();
    alertHistory.length = 0;

    document.body.classList.remove("waiting-confirmation");

    const alertPanel = getElement("alertConfirmationPanel");
    if (alertPanel) alertPanel.classList.add("hidden");

    const chartsSection = getElement("chartsSection");
    if (chartsSection) chartsSection.style.display = "none";

    const logList = getElement("logList");
    if (logList) logList.innerHTML = "";

    const logCounter = getElement("logCounter");
    if (logCounter) logCounter.innerText = "0 sự kiện";

    addLog(
        "02:50",
        "AI",
        "Hệ thống khởi tạo mô phỏng<br>Sẵn sàng chạy dữ liệu MITRA BHUM."
    );

    updateDashboard();
}

// =========================================================
// Excel export
// =========================================================
// Dán khối này vào app.js để thay phần xuất Excel cũ.

const TDR_STYLE = {
    navy: "FF0B2B4B",
    blue: "FFB8CEE8",
    lightBlue: "FFDCE8F5",
    white: "FFFFFFFF",
    black: "FF000000",
    gray: "FFF2F2F2",
    thinGray: "FF7F7F7F"
};

function tdrBorder() {
    const side = { style: "thin", color: { argb: TDR_STYLE.black } };
    return { top: side, left: side, bottom: side, right: side };
}

function styleRange(ws, range, style) {
    const [start, end] = range.split(":");
    const startCell = ws.getCell(start);
    const endCell = ws.getCell(end || start);

    for (let row = startCell.row; row <= endCell.row; row += 1) {
        for (let col = startCell.col; col <= endCell.col; col += 1) {
            const cell = ws.getCell(row, col);
            if (style.font) cell.font = style.font;
            if (style.fill) cell.fill = style.fill;
            if (style.alignment) cell.alignment = style.alignment;
            if (style.border) cell.border = style.border;
            if (style.numFmt) cell.numFmt = style.numFmt;
        }
    }
}

function mergeAndSet(ws, range, value, options = {}) {
    ws.mergeCells(range);
    const cell = ws.getCell(range.split(":")[0]);
    cell.value = value;
    cell.font = options.font || { name: "Arial", size: 10 };
    cell.alignment = options.alignment || {
        vertical: "middle",
        horizontal: "center",
        wrapText: true
    };
    if (options.fill) cell.fill = options.fill;
    styleRange(ws, range, {
        border: options.border || tdrBorder(),
        fill: options.fill,
        font: cell.font,
        alignment: cell.alignment
    });
    return cell;
}

function addTableHeader(ws, range, value, fontSize = 9) {
    return mergeAndSet(ws, range, value, {
        font: {
            name: "Arial",
            size: fontSize,
            bold: true,
            color: { argb: TDR_STYLE.navy }
        },
        fill: {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: TDR_STYLE.blue }
        },
        alignment: {
            vertical: "middle",
            horizontal: "center",
            wrapText: true
        }
    });
}

function writeLabelValue(ws, row, label, value) {
    mergeAndSet(ws, `A${row}:C${row}`, label, {
        font: { name: "Arial", size: 9, bold: true, italic: true },
        alignment: { vertical: "middle", horizontal: "left" }
    });

    mergeAndSet(ws, `D${row}:H${row}`, value, {
        font: { name: "Arial", size: 9 },
        alignment: { vertical: "middle", horizontal: "left" }
    });
}

async function exportExcel() {
    if (typeof ExcelJS === "undefined") {
        window.alert("Chưa tải được thư viện ExcelJS.");
        return;
    }

    if (typeof saveAs === "undefined") {
        window.alert("Chưa tải được thư viện FileSaver.");
        return;
    }

    const state = getCurrentState();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MITRA BHUM AI Dashboard";
    workbook.created = new Date();
    workbook.modified = new Date();

    const ws = workbook.addWorksheet("TDR", {
        pageSetup: {
            orientation: "landscape",
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            margins: {
                left: 0.25,
                right: 0.25,
                top: 0.35,
                bottom: 0.35,
                header: 0.1,
                footer: 0.1
            }
        },
        properties: { defaultRowHeight: 18 }
    });

    ws.views = [{ showGridLines: false, zoomScale: 80 }];
    ws.pageSetup.printArea = "A1:Q42";

    const widths = [6, 8, 8, 9, 8, 9, 9, 8, 9, 9, 9, 9, 9, 9, 9, 9, 10];
    widths.forEach((width, index) => {
        ws.getColumn(index + 1).width = width;
    });

    // Tiêu đề, không dùng logo.
    mergeAndSet(ws, "A1:Q2", "TERMINAL DEPARTURE REPORT", {
        font: {
            name: "Arial",
            size: 16,
            bold: true,
            color: { argb: TDR_STYLE.navy }
        },
        alignment: { vertical: "middle", horizontal: "center" },
        border: {}
    });
    ws.getRow(1).height = 24;
    ws.getRow(2).height = 24;

    mergeAndSet(
        ws,
        "M3:Q3",
        `Update: ${vesselData.operationDate} 09:15`,
        {
            font: { name: "Arial", size: 9, bold: true },
            alignment: { vertical: "middle", horizontal: "right" },
            border: {}
        }
    );

    // Dòng PORT / REPORT / PLANNER.
    addTableHeader(ws, "A4:C4", "PORT");
    addTableHeader(ws, "D4:H4", "REPORT");
    addTableHeader(ws, "I4:Q4", "PLANNER");

    mergeAndSet(ws, "A5:C5", "TAN CANG HIEP PHUOC PORT", {
        font: { name: "Arial", size: 9, bold: true },
        alignment: { vertical: "middle", horizontal: "center" }
    });
    mergeAndSet(ws, "D5:H5", "TDR", {
        font: { name: "Arial", size: 9 },
        alignment: { vertical: "middle", horizontal: "center" }
    });
    mergeAndSet(ws, "I5:Q5", vesselData.planner || "Lê Anh Tú", {
        font: { name: "Arial", size: 9 },
        alignment: { vertical: "middle", horizontal: "center" }
    });

    // Thông tin tàu.
    const date = vesselData.operationDate;
    writeLabelValue(ws, 7, "Vessel:", vesselData.vessel);
    writeLabelValue(ws, 8, "Voyage:", `${vesselData.voyage} / ${vesselData.voyage}`);
    writeLabelValue(ws, 9, "ETB:", `${date} 02:30 AM`);
    writeLabelValue(ws, 10, "ATB:", `${date} ${vesselData.atb} AM`);
    writeLabelValue(ws, 11, "Commenced discharging:", `${date} ${vesselData.atb} AM`);
    writeLabelValue(ws, 12, "Completed discharging:", `${date} ${vesselData.atb} AM`);
    writeLabelValue(ws, 13, "Commenced loading:", `${date} ${vesselData.loadingStart} AM`);
    writeLabelValue(ws, 14, "Completed loading:", `${date} ${vesselData.loadingFinish} AM`);
    writeLabelValue(ws, 15, "ETU:", `${date} ${vesselData.atd} AM`);
    writeLabelValue(ws, 16, "ATU:", `${date} ${vesselData.atd} AM`);

    mergeAndSet(ws, "I7:J16", "Remark:", {
        font: { name: "Arial", size: 9, bold: true, italic: true },
        alignment: { vertical: "middle", horizontal: "center" }
    });
    mergeAndSet(ws, "K7:Q16", `Crane ratio = ${vesselData.finalKpi.craneRatio}`, {
        font: { name: "Arial", size: 10, bold: true, italic: true },
        alignment: { vertical: "middle", horizontal: "center" }
    });

    // Thời gian và năng suất.
    addTableHeader(ws, "A17:C17", "Time (hours)");
    addTableHeader(ws, "D17:E17", "Portstay");
    addTableHeader(ws, "F17:G17", "Dis");
    addTableHeader(ws, "H17:I17", "Load");
    addTableHeader(ws, "J17:K17", "Net");
    addTableHeader(ws, "L17:M17", "B.Time");
    addTableHeader(ws, "N17:O17", "A.Portstay");
    addTableHeader(ws, "P17:Q17", "A.Net");

    const timeValues = [
        ["D18", vesselData.finalKpi.portStayHours],
        ["F18", 0],
        ["H18", vesselData.finalKpi.workingHours],
        ["J18", vesselData.finalKpi.workingHours],
        ["L18", 0],
        ["N18", vesselData.finalKpi.berthProductivity],
        ["P18", vesselData.finalKpi.cargoProductivity]
    ];

    ["D18:E18", "F18:G18", "H18:I18", "J18:K18", "L18:M18", "N18:O18", "P18:Q18"]
        .forEach(range => mergeAndSet(ws, range, "", {
            font: { name: "Arial", size: 9 },
            alignment: { vertical: "middle", horizontal: "center" }
        }));

    timeValues.forEach(([address, value]) => {
        ws.getCell(address).value = value;
        ws.getCell(address).numFmt = "0.00";
    });

    // Bảng cẩu.
    addTableHeader(ws, "A20:B21", "TERMINAL CRANES");
    addTableHeader(ws, "C20:D20", "COMMENCED LOADING");
    addTableHeader(ws, "E20:F20", "COMPLETED LOADING");
    addTableHeader(ws, "G20:H21", "TTL MOVE");
    addTableHeader(ws, "I20:J21", "IDLE TIME\nHH/MM");
    addTableHeader(ws, "K20:L21", "PRODUCTIVITY\nCONT/SH");
    addTableHeader(ws, "M20:M21", "BOOMING\nHH/MM");
    addTableHeader(ws, "N20:N21", "STOP OPERATION\nHH/MM");
    addTableHeader(ws, "O20:P21", "LASHING\nHH/MM");
    addTableHeader(ws, "Q20:Q21", "CRANES OBSTRUCTION\nHH/MM");
    addTableHeader(ws, "C21:C21", "DD/MM/YY", 7);
    addTableHeader(ws, "D21:D21", "HH/MM", 7);
    addTableHeader(ws, "E21:E21", "DD/MM/YY", 7);
    addTableHeader(ws, "F21:F21", "HH/MM", 7);

    CRANES.forEach((crane, index) => {
        const row = 22 + index;
        const values = [
            index + 1,
            crane.bay,
            date,
            vesselData.loadingStart,
            date,
            crane.predictedFinish,
            crane.target,
            "",
            "00:00",
            "",
            crane.productivity,
            "",
            "00:00",
            "00:00",
            "00:00",
            "",
            "00:00"
        ];

        values.forEach((value, colIndex) => {
            const cell = ws.getCell(row, colIndex + 1);
            cell.value = value;
            cell.font = { name: "Arial", size: 8 };
            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true
            };
            cell.border = tdrBorder();
        });
    });

    for (let row = 25; row <= 26; row += 1) {
        for (let col = 1; col <= 17; col += 1) {
            const cell = ws.getCell(row, col);
            cell.value = col === 1 ? row - 21 : "";
            cell.border = tdrBorder();
            cell.alignment = { vertical: "middle", horizontal: "center" };
        }
    }

    // Summary.
    addTableHeader(ws, "A28:C28", "SUMMARY");
    addTableHeader(ws, "D28:I28", "LOCAL MOVES");
    addTableHeader(ws, "J28:Q28", "TRANSHIPMENT MOVES");
    addTableHeader(ws, "D29:F29", "DRY");
    addTableHeader(ws, "G29:I29", "REEFER");
    addTableHeader(ws, "J29:L29", "DRY");
    addTableHeader(ws, "M29:Q29", "REEFER");

    const summaryHeaders = ["", "", "", "20'", "40'", "45'", "20'", "40'", "45'", "TOTAL", "20'", "40'", "45'", "20'", "40'", "45'", "TOTAL"];
    summaryHeaders.forEach((value, index) => {
        const cell = ws.getCell(30, index + 1);
        cell.value = value;
        cell.font = { name: "Arial", size: 8, bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TDR_STYLE.blue } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = tdrBorder();
    });

    const summaryRows = [
        ["TOTAL", "", "", 101, 131, "", "", "", "", 232, "", "", "", "", "", "", ""],
        ["TOTAL DISCH EMPTY", "", "", "", "", "", "", "", "", 0, "", "", "", "", "", "", ""],
        ["TOTAL DISCH FULL", "", "", "", "", "", "", "", "", 0, "", "", "", "", "", "", ""],
        ["TOTAL LOAD EMPTY", "", "", "", 109, "", "", "", "", vesselData.containers.empty, "", "", "", "", "", "", ""],
        ["TOTAL LOAD FULL", "", "", 101, 22, "", "", "", "", vesselData.containers.full, "", "", "", "", "", "", ""],
        ["TCL 2.LOAD EMPTY", "", "", "", 109, "", "", "", "", vesselData.containers.empty, "", "", "", "", "", "", ""],
        ["TCL 2.LOAD FULL", "", "", 101, 22, "", "", "", "", vesselData.containers.full, "", "", "", "", "", "", ""]
    ];

    summaryRows.forEach((values, rowIndex) => {
        const row = 31 + rowIndex;
        values.forEach((value, colIndex) => {
            const cell = ws.getCell(row, colIndex + 1);
            cell.value = value;
            cell.font = {
                name: "Arial",
                size: 8,
                bold: colIndex === 0 || colIndex === 9
            };
            cell.alignment = {
                vertical: "middle",
                horizontal: colIndex === 0 ? "left" : "center",
                wrapText: true
            };
            cell.border = tdrBorder();
        });
    });

    // GEAR BOX / HATCH COVER.
    mergeAndSet(ws, "A40:C40", "GEAR BOX", {
        font: { name: "Arial", size: 9, bold: true },
        alignment: { vertical: "middle", horizontal: "left" }
    });
    mergeAndSet(ws, "D40:Q40", "1", {
        font: { name: "Arial", size: 9 },
        alignment: { vertical: "middle", horizontal: "left" }
    });
    mergeAndSet(ws, "A41:C41", "HATCH COVER", {
        font: { name: "Arial", size: 9, bold: true },
        alignment: { vertical: "middle", horizontal: "left" }
    });
    mergeAndSet(ws, "D41:Q41", "5", {
        font: { name: "Arial", size: 9 },
        alignment: { vertical: "middle", horizontal: "left" }
    });

    // Ghi chú xác nhận cảnh báo.
    if (confirmedAlerts && confirmedAlerts.size > 0) {
        const notes = Array.from(confirmedAlerts.values())
            .map(item => `${item.time} - ${item.title}: ${item.selections.join("; ")} (${item.confirmer})`)
            .join("\n");

        mergeAndSet(ws, "A43:Q46", notes, {
            font: { name: "Arial", size: 8, italic: true },
            alignment: { vertical: "top", horizontal: "left", wrapText: true },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: TDR_STYLE.gray } }
        });
        ws.pageSetup.printArea = "A1:Q46";
    }

    // Áp dụng font và chiều cao chung.
    for (let row = 1; row <= ws.rowCount; row += 1) {
        ws.getRow(row).height = ws.getRow(row).height || 18;
    }

    ws.headerFooter.oddFooter =
        "&LGenerated from MITRA BHUM AI Dashboard&CPage &P of &N&RInternal use";

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }),
        `${vesselData.vessel.replaceAll(" ", "_")}_TDR.xlsx`
    );
}

// Expose functions for inline onclick handlers in index.html.
window.playSimulation = playSimulation;
window.nextEvent = nextEvent;
window.resetSimulation = resetSimulation;
window.exportExcel = exportExcel;
window.confirmActiveAlert = confirmActiveAlert;

// =========================================================
// Initialization
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    ensureAlertConfirmationPanel();

    const playButton = getElement("playButton");
    const nextButton = getElement("nextEventButton");

    if (playButton && !playButton.getAttribute("onclick")) {
        playButton.addEventListener("click", playSimulation);
    }

    if (nextButton && !nextButton.getAttribute("onclick")) {
        nextButton.addEventListener("click", nextEvent);
    }

    addLog(
        "02:50",
        "AI",
        "Hệ thống khởi tạo mô phỏng<br>Sẵn sàng chạy dữ liệu MITRA BHUM."
    );

    updateDashboard();
});

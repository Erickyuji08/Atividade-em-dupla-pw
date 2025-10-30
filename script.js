
// Funções de cookies 
function acceptCookies() {
    const cookieNotice = document.getElementById("cookieNotice");
    if (cookieNotice) {
        cookieNotice.classList.add("hidden");
        localStorage.setItem("cookiesAccepted", "true");
    }
}

window.addEventListener("load", () => {
    const cookiesAccepted = localStorage.getItem("cookiesAccepted");
    const cookieNotice = document.getElementById("cookieNotice");
    if (cookiesAccepted !== "true" && cookieNotice) {
        cookieNotice.classList.remove("hidden");
    }
});
    const style = document.createElement("style");

document.addEventListener("DOMContentLoaded", () => {
    // Inicializar funcionalidade de tabs (tudo sobre)
    const tabs = document.querySelectorAll(".tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            tabContents.forEach(content => content.classList.remove("active"));
            const tabId = tab.getAttribute("data-tab");
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add("active");
            }
        });
    });    
});
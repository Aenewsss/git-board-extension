import { getUserOrganizations, getOrganizationProjects } from "./github-api.js";

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    if (token) {
        // Salva o token no localStorage para ser reutilizado futuramente
        localStorage.setItem("github_token", token);
        window.history.replaceState({}, document.title, "popup.html"); // Remove o token da URL

        // Atualiza a interface da extensão e carrega projetos
        updateUI();
    } else {
        // Se não há token na URL, tenta carregar do localStorage
        const savedToken = localStorage.getItem("github_token");
        if (savedToken) updateUI();
        else {
            document.getElementById("logoutGitHub").style.display = "none";
            document.getElementById("projectContainer").style.display = "none";
            document.getElementById("organizationContainer").style.display = "none";
        }
    }
});

// Evento de login no GitHub
document.getElementById("loginGitHub").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://git-board-ai-6dce65bdb713.herokuapp.com/login/github" });
});

// 🔹 Criar a tarefa
document.getElementById("createTask").addEventListener("click", async () => {
    const taskText = document.getElementById("taskInput").value;
    const projectId = document.getElementById("projectSelect").value;
    const organizationId = document.getElementById("organizationSelect").value;
    const accessToken = localStorage.getItem("github_token");

    if (!taskText || !projectId || !organizationId) return alert("Preencha todos os campos!");

    try {
        chrome.runtime.sendMessage({ action: "processText", data: { taskText, projectId, organizationId, accessToken } })
        alert("Tarefa criada com sucesso!");
    } catch (error) {
        alert("Erro ao criar a tarefa: " + error.message);
    }
});

// Botão de logout - Remove token e oculta UI
document.getElementById('logoutGitHub').addEventListener("click", () => {
    localStorage.removeItem("github_token");
    window.location.href = "popup.html"; // Recarrega a extensão
});

// 🔹 Atualiza a interface com base na autenticação e carrega projetos
function updateUI() {
    document.getElementById("taskInput").style.display = "block";
    document.getElementById("createTask").style.display = "block";
    document.getElementById("loginGitHub").style.display = "none"; // Esconde o botão de login
    document.getElementById("logoutGitHub").style.display = "block"; // Exibe o botão de logout

    // Chama a função para carregar projetos após a autenticação
    loadOrganizationsAndProjects();
}

// 🔹 Carrega as organizações e seus projetos
async function loadOrganizationsAndProjects() {
    const accessToken = localStorage.getItem("github_token");
    if (!accessToken) return;

    try {
        const organizations = await getUserOrganizations(accessToken);
        if (organizations.length === 0) {
            console.warn("Nenhuma organização encontrada.");
            return;
        }


        const orgSelect = document.getElementById("organizationSelect");
        orgSelect.innerHTML = ""

        // Preenche o dropdown de organizações
        organizations.forEach(org => {
            let option = document.createElement("option");
            option.value = org.login;
            option.textContent = org.login;
            orgSelect.appendChild(option);
        });

        // alert(JSON.stringify(organizations))
        // Quando uma organização for selecionada, carrega seus projetos
        orgSelect.addEventListener("change", async () => {
            await loadProjects(orgSelect.value);
        });

        console.log(organizations)

        // Carrega automaticamente os projetos da primeira organização
        await loadProjects(organizations[0].login);
    } catch (error) {
        console.error("Erro ao carregar organizações e projetos:", error);
    }
}

// 🔹 Carrega os projetos da organização selecionada
async function loadProjects(orgLogin) {
    const accessToken = localStorage.getItem("github_token");
    if (!accessToken) return;

    try {
        const projects = await getOrganizationProjects(orgLogin, accessToken);
        const select = document.getElementById("projectSelect");
        select.innerHTML = "";

        projects.forEach(proj => {
            let option = document.createElement("option");
            option.value = proj.id;
            option.textContent = proj.title;
            select.appendChild(option);
        });

        document.getElementById("projectContainer").style.display = "block";
    } catch (error) {
        console.error("Erro ao carregar projetos:", error);
    }
}
// 🔹 Obtém a lista de organizações do usuário autenticado
async function getUserOrganizations(accessToken) {
    try {
        const response = await fetch("https://api.github.com/user/orgs", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json"
            }
        });

        if (!response.ok) throw new Error("Erro ao buscar organizações");

        const organizations = await response.json();
        return organizations.map(org => ({ id: org.id, login: org.login })); // Retorna ID e nome
    } catch (error) {
        console.error("Erro ao obter organizações:", error);
        return [];
    }
}

// 🔹 Obtém os projetos de uma organização específica
async function getOrganizationProjects(orgLogin, token) {
    const query = `
        query {
            organization(login: "${orgLogin}") {
                projectsV2(first: 10) {
                    nodes {
                        id
                        title
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();

        if (!data.data.organization) {
            console.error("Erro: Organização não encontrada ou sem projetos.");
            return [];
        }

        return data.data.organization.projectsV2.nodes.map(proj => ({
            id: proj.id,
            title: proj.title
        }));
    } catch (error) {
        console.error("Erro ao buscar projetos:", error);
        return [];
    }
}

// 🔹 Exportando funções para uso em outros arquivos
export { getUserOrganizations, getOrganizationProjects };
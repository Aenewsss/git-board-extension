chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'processText') {
        
        const data = request.data
        
        if (!data.accessToken) {
            return sendResponse({ success: false, error: "Usuário não autenticado" });
        }
        // Processa o texto com a API da Groq e cria a tarefa no GitHub
        processTextWithGroq(data.taskText)
            .then((processedData) => createGitHubTask(processedData, data.projectId, data.accessToken))
            .then(() => sendResponse({ success: true }))
            .catch((error) => sendResponse({ success: false, error: error.message }));

        return true; // Indica que a resposta será enviada assincronamente
    }
});

async function processTextWithGroq(text) {
    // Faz a requisição para a API da Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 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'
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile', // Ou outro modelo suportado pela Groq
            messages: [
                {
                    role: 'system',
                    content: `Você é um assistente especializado em desenvolvimento de software e gerenciamento de projetos. 
                    Sua tarefa é analisar um texto de entrada e gerar uma saída estruturada no seguinte formato:\n\n
                    1. **Title**: Um título curto e descritivo de no máximo 100 caracteres para a tarefa.\n
                    2. **User Story**: Uma descrição clara e concisa da funcionalidade da perspectiva do usuário, 
                    seguindo o formato: "Como um [tipo de usuário], eu quero [uma ação] para que [um benefício]."\n
                    3. **Requirements**: Uma lista de requisitos técnicos ou funcionais necessários para implementar a user story.\n
                    4. **Acceptance Criteria**: Um conjunto de condições que devem ser atendidas para que a user story seja 
                    considerada concluída.\n\nSua resposta deve ser bem organizada, fácil de entender e diretamente derivada do texto de entrada. 
                    Use negrito para os títulos (Title, User Story, Requirements, Acceptance Criteria) e texto simples para os valores. 
                    Toda a saída deve estar em **português**.`
                },
                {
                    role: 'user',
                    content: text
                }
            ]
        })
    });

    if (!response.ok) {
        throw new Error('Erro ao processar o texto com a API da Groq');
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    // Extrai User Story, Requirements e Acceptance Criteria do texto gerado
    const title = extractSection(generatedText, 'Title');
    const userStory = extractSection(generatedText, 'User Story');
    const requirements = extractSection(generatedText, 'Requirements');
    const acceptanceCriteria = extractSection(generatedText, 'Acceptance Criteria');

    return { title, userStory, requirements, acceptanceCriteria };
}

function extractSection(text, sectionName) {
    const regex = new RegExp(`\\*\\*${sectionName}\\*\\*: ([\\s\\S]*?)(\\n\\n|$)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
}

async function createGitHubTask(taskData, projectId, githubToken) {
    // Monta o corpo da tarefa
    const taskBody = `## User Story
    ${taskData.userStory}
    
    ## Requisitos
    ${taskData.requirements}
    
    ## Critérios de Aceite
    ${taskData.acceptanceCriteria}
  `;

    const escapedTitle = taskData.title.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const escapedBody = taskBody
        .split('\n') // Divide o texto em linhas
        .map(line => line.trimStart()) // Remove espaços ou tabulações do início de cada linha
        .join('\n') // Junta as linhas de volta em uma única string
        .replace(/"/g, '\\"') // Escapa as aspas
        .replace(/\n/g, '\\n'); // Substitui as quebras de linha

    // Query GraphQL para criar um item no projeto
    const query = `
      mutation {
        addProjectV2DraftIssue(input: {
          projectId: "${projectId}"
          title: "${escapedTitle}"
          body: "${escapedBody}"
        }) {
          projectItem {
            id
          }
        }
      }
    `;

    // Faz a requisição para a API GraphQL do GitHub
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${githubToken}`
        },
        body: JSON.stringify({ query })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao criar a tarefa no GitHub Projects: ${errorData.message}`);
    }

    const data = await response.json();
    return data;
}
(function (window, document) {
    'use strict';

    // =========================================================================
    // CONFIGURAÇÕES E CONSTANTES GLOBAIS
    // =========================================================================
    const ADMIN_EMAIL = "admin@velocityx.com"; // E-mail do administrador fixo
    const LS_KEY_USERS = 'usuarios';
    const LS_KEY_PROPOSALS = 'propostas';
    const LS_KEY_LOGGED_USER = 'loggedUser';
    const LS_KEY_COOKIES_ACCEPTED = 'cookiesAccepted';

    // =========================================================================
    // ARMAZENAMENTO LOCAL (LOCAL STORAGE)
    // =========================================================================
    // Controla leitura, gravação e remoção de dados no localStorage em JSON.

    const Armazenamento = {

        // Lê um valor armazenado, retornando um padrão se não existir ou falhar
        ler(chave, padrao = null) {
            try {
                const bruto = localStorage.getItem(chave);
                return bruto ? JSON.parse(bruto) : padrao;
            } catch {
                console.error('Erro ao ler o armazenamento para a chave:', chave);
                return padrao;
            }
        },

        // Grava o valor convertido em JSON
        escrever(chave, valor) {
            localStorage.setItem(chave, JSON.stringify(valor));
        },

        // Remove a chave do armazenamento
        remover(chave) {
            localStorage.removeItem(chave);
        }
    };


    // =========================================================================
    // REPOSITÓRIOS DE DADOS (USUÁRIOS E PROPOSTAS)
    // =========================================================================
    // Gerencia dados de usuários no localStorage, incluindo o administrador fixo.

    const UsuariosRepo = {

        // Retorna todos os usuários salvos (inclui admin fixo se não existir)
        todos() {
            let users = Armazenamento.ler(LS_KEY_USERS, []);
            if (!users.some(u => u.email === ADMIN_EMAIL)) {
                users.unshift({
                    id: 0,
                    nome: "Administrador",
                    email: ADMIN_EMAIL,
                    password: "admin", // Senha padrão do admin
                    isAdmin: true
                });
            }
            return users;
        },

        // Salva lista de usuários (remove admin fixo antes de gravar)
        salvar(lista) {
            const usersToSave = lista.filter(u => u.email !== ADMIN_EMAIL);
            Armazenamento.escrever(LS_KEY_USERS, usersToSave);
        },

        // Busca um usuário pelo e-mail (ignora maiúsculas/minúsculas)
        obterPorEmail(email) {
            const alvo = (email || '').toLowerCase();
            return this.todos().find(u => (u.email || '').toLowerCase() === alvo) || null;
        },

        // Verifica se um e-mail já está cadastrado
        existe(email) {
            return !!this.obterPorEmail(email);
        },

        // Adiciona um novo usuário (mantendo o admin fora da lista)
        adicionar(user) {
            const lista = this.todos().filter(u => u.email !== ADMIN_EMAIL);
            lista.push(user);
            this.salvar(lista);
        },

        // Atualiza a senha de um usuário comum (não afeta o admin)
        atualizarSenha(email, novaSenha) {
            const lista = this.todos().map(u => {
                if (u.email.toLowerCase() === email.toLowerCase() && !u.isAdmin)
                    u.password = novaSenha;
                return u;
            });
            this.salvar(lista);
        }
    };

    // =========================================================================
    // SESSÃO
    // =========================================================================
    // Controla o usuário atualmente logado no sistema.

    const Sessao = {

        // Define o usuário logado e salva no localStorage
        definir(user) {
            Armazenamento.escrever(LS_KEY_LOGGED_USER, user);
        },

        // Retorna o usuário logado (ou null se não houver)
        obter() {
            return Armazenamento.ler(LS_KEY_LOGGED_USER, null);
        },

        // Remove os dados de login do armazenamento (logout)
        limpar() {
            Armazenamento.remover(LS_KEY_LOGGED_USER);
        }
    };


    // =========================================================================
    // PROPOSTA
    // =========================================================================
    // Gerencia as propostas armazenadas localmente.

    const PropostasRepo = {

        // Retorna todas as propostas salvas
        todas() {
            return Armazenamento.ler(LS_KEY_PROPOSALS, []);
        },

        // Salva a lista completa de propostas
        salvar(lista) {
            Armazenamento.escrever(LS_KEY_PROPOSALS, lista);
        },

        // Adiciona uma nova proposta à lista existente
        adicionar(proposta) {
            const lista = this.todas();
            lista.push(proposta);
            this.salvar(lista);
        }
    };

    // --------------------------- Interface --------------------------------
    // Funções simples de interação com o usuário e navegação.

    const IU = {

        // Redireciona para a URL informada
        navegar(url) {
            window.location.href = url;
        },

        // Exibe uma mensagem em alerta
        msg(texto) {
            alert(texto);
        }
    };


    // =========================================================================
    // LÓGICA DE PÁGINAS E FLUXOS DE NAVEGAÇÃO
    // =========================================================================
    // Controla o comportamento e navegação entre as páginas do sistema.
    // Cada chave representa uma "página" ou "fluxo" (login, cadastro, proposta, etc.)

    const Paginas = {

        // =========================================================================
        // NEGOCIE (Página inicial — decide para onde o usuário vai)
        // =========================================================================
        negocie: {
            acionar() {
                const user = Sessao.obter();
                const usuarios = UsuariosRepo.todos();

                // Se já estiver logado, vai direto para proposta
                if (user) {
                    IU.navegar('proposta.html');
                }
                // Se só existir o admin fixo, vai para cadastro
                else if (usuarios.length === 1 && usuarios[0].isAdmin) {
                    IU.navegar('cadastro.html');
                }
                // Caso contrário, pede login
                else {
                    IU.navegar('login.html');
                }
            }
        },

        // =========================================================================
        // LOGIN
        // =========================================================================
        login: {
            // Faz login validando o e-mail e senha
            entrar() {
                const email = (document.getElementById('email')?.value || '').trim();
                const senha = document.getElementById('password')?.value || '';

                if (!email || !senha) return IU.msg('Preencha e-mail e senha.');

                const user = UsuariosRepo.obterPorEmail(email);
                if (!user || user.password !== senha)
                    return IU.msg('E-mail ou senha incorretos.');

                // Salva usuário logado e redireciona
                Sessao.definir(user);
                IU.msg('Login realizado com sucesso!');
                if (user.isAdmin) {
                    IU.navegar('admin.html');
                } else {
                    IU.navegar('proposta.html');
                }
            },

            // Encerra a sessão e volta para login
            sair() {
                Sessao.limpar();
                IU.navegar('login.html');
            }
        },

        // =========================================================================
        // CADASTRO
        // =========================================================================
        cadastro: {
            // Cadastra novo usuário e salva no Local Storage
            salvar() {
                const nome = (document.getElementById('nome')?.value || '').trim();
                const email = (document.getElementById('email')?.value || '').trim();
                const telefone = (document.getElementById('telefone')?.value || '').trim();
                const dataNascimento = document.getElementById('dataNascimento')?.value;
                const cep = (document.getElementById('cep')?.value || '').trim();
                const senha = document.getElementById('password')?.value || '';
                const confirmar = document.getElementById('confirmPassword')?.value || '';

                // Validações básicas
                if (!nome || !email || !telefone || !dataNascimento || !cep || !senha || !confirmar)
                    return IU.msg('Preencha todos os campos.');
                if (senha !== confirmar) return IU.msg('As senhas não coincidem.');
                if (UsuariosRepo.existe(email)) return IU.msg('E-mail já cadastrado.');

                // Cria novo usuário
                const novo = {
                    id: Date.now(),
                    nome, email, telefone, dataNascimento, cep,
                    password: senha,
                    isAdmin: false
                };

                UsuariosRepo.adicionar(novo);
                Sessao.definir(novo);
                IU.msg('Cadastro realizado com sucesso!');
                IU.navegar('proposta.html');
            }
        },

        // =========================================================================
        // RESET DE SENHA
        // =========================================================================
        reset: {
            // Etapa 1: valida o e-mail e avança para a criação de nova senha
            handleEmailForm: (e) => {
                e.preventDefault();
                const email = document.getElementById("resetEmail").value;
                const user = UsuariosRepo.obterPorEmail(email);
                const step1 = document.getElementById("step1");
                const step2 = document.getElementById("step2");
                const formTitle = document.getElementById("formTitle");
                const messageContainer = document.getElementById("messageContainer");

                // Função auxiliar para exibir mensagens de status
                function showMessage(text, type) {
                    messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
                }

                if (user && !user.isAdmin) {
                    // E-mail válido: avança para nova senha
                    localStorage.setItem('resetEmail', email);
                    step1.style.display = "none";
                    step2.style.display = "block";
                    formTitle.textContent = "Nova Senha";
                    showMessage("E-mail confirmado. Por favor, defina sua nova senha.", "success");
                } else if (user && user.isAdmin) {
                    showMessage("Não é possível redefinir a senha do administrador fixo.", "error");
                } else {
                    showMessage("E-mail não encontrado. Verifique se digitou corretamente.", "error");
                }
            },

            // Etapa 2: define a nova senha e salva
            handlePasswordForm: (e) => {
                e.preventDefault();
                const confirmedEmail = localStorage.getItem('resetEmail');
                const newPassword = document.getElementById("newPassword").value;
                const confirmPassword = document.getElementById("confirmPassword").value;
                const messageContainer = document.getElementById("messageContainer");

                function showMessage(text, type) {
                    messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
                }

                // Validação de senha
                if (newPassword !== confirmPassword)
                    return showMessage("As senhas não coincidem.", "error");
                if (newPassword.length < 6)
                    return showMessage("A senha deve ter pelo menos 6 caracteres.", "error");

                // Atualiza no Local Storage
                const userToUpdate = UsuariosRepo.todos().find(u => u.email === confirmedEmail);

                if (userToUpdate) {
                    UsuariosRepo.atualizarSenha(confirmedEmail, newPassword);
                    showMessage("Senha redefinida com sucesso! Redirecionando...", "success");

                    setTimeout(() => {
                        localStorage.removeItem('resetEmail');
                        IU.navegar("login.html");
                    }, 2000);
                } else {
                    showMessage("Erro ao redefinir a senha. Tente novamente.", "error");
                }
            }
        },

        // =========================================================================
        // PROPOSTA
        // =========================================================================
        proposta: {
            // Lista de veículos disponíveis
            VEHICLES: [
                { name: "Sport", image: "imagens/sport_branco.png" },
                { name: "Elite", image: "imagens/elite_branco.png" },
                { name: "Premium", image: "imagens/premium_branco.png" }
            ],

            // Carrega a página de proposta com usuário e veículos
            carregar: () => {
                const user = Sessao.obter();
                const propostaForm = document.getElementById("propostaForm");
                const userInfoDiv = document.getElementById("userInfo");
                const vehicleSelectionDiv = document.getElementById("vehicleSelection");
                const veiculoInput = document.getElementById("veiculo");

                // Protege acesso — só logado pode enviar proposta
                if (!user) {
                    IU.msg("Você precisa estar logado para enviar uma proposta.");
                    IU.navegar("login.html");
                    return;
                }

                // Exibe informações do usuário logado
                if (userInfoDiv) {
                    userInfoDiv.innerHTML = `
                    <p><strong>Usuário Logado:</strong> ${user.email}</p>
                    <p><strong>Status:</strong> ${user.isAdmin ? 'Administrador' : 'Usuário Comum'}</p>
                `;
                }

                // Renderiza os cards de veículos
                if (vehicleSelectionDiv) {
                    Paginas.proposta.VEHICLES.forEach(vehicle => {
                        const card = document.createElement("div");
                        card.className = "vehicle-card";
                        card.setAttribute("data-vehicle", vehicle.name);
                        card.innerHTML = `
                        <img src="${vehicle.image}" alt="${vehicle.name}">
                        <h4>${vehicle.name}</h4>
                    `;

                        // Seleção visual e valor oculto
                        card.addEventListener("click", () => {
                            document.querySelectorAll(".vehicle-card").forEach(c => c.classList.remove("selected"));
                            card.classList.add("selected");
                            if (veiculoInput) veiculoInput.value = vehicle.name;
                        });

                        vehicleSelectionDiv.appendChild(card);
                    });
                }

                // Vincula o envio do formulário
                if (propostaForm) {
                    propostaForm.addEventListener("submit", Paginas.proposta.enviar);
                }
            },

            // Envia a proposta e salva no Local Storage
            enviar: (e) => {
                e.preventDefault();

                const user = Sessao.obter();
                const veiculo = document.getElementById("veiculo")?.value;
                const valorProposto = document.getElementById("valorProposto")?.value;
                const observacoes = document.getElementById("observacoes")?.value;

                if (!veiculo) return IU.msg("Por favor, selecione um veículo.");
                if (!valorProposto) return IU.msg("Por favor, informe o valor proposto.");

                // Cria objeto de proposta
                const novaProposta = {
                    id: Date.now(),
                    data: new Date().toLocaleString('pt-BR'),
                    veiculo,
                    valorProposto: `R$ ${parseFloat(valorProposto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    observacoes,
                    usuarioEmail: user.email,
                    usuarioIsAdmin: user.isAdmin
                };

                PropostasRepo.adicionar(novaProposta);
                IU.msg("Proposta enviada com sucesso! Agradecemos seu interesse.");
                IU.navegar("index.html");
            }
        },

// =========================================================================
// ADMIN (visualização de propostas)
// =========================================================================
admin: {
    carregar: () => {
        const user = Sessao.obter();
        const propostasListDiv = document.getElementById("propostasList");

        // Protege rota — apenas admin pode acessar
        if (!user || !user.isAdmin) {
            IU.msg('Acesso restrito ao administrador.');
            IU.navegar('login.html');
            return;
        }

        // Renderiza tabela de propostas recebidas
        function renderProposals() {
            const proposals = PropostasRepo.todas();
            if (!propostasListDiv) return;

            if (proposals.length === 0) {
                propostasListDiv.innerHTML = '<p class="no-proposals">Nenhuma proposta de veículo encontrada.</p>';
                return;
            }

            let tableHTML = `
            <table class="propostas-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Data</th>
                        <th>Veículo</th>
                        <th>Valor Proposto</th>
                        <th>Usuário (E-mail)</th>
                        <th>Telefone</th> <!-- NOVA COLUNA -->
                        <th>Observações</th>
                    </tr>
                </thead>
                <tbody>
            `;

            proposals.forEach(p => {
                // 1. Busca o usuário completo para obter o telefone
                const proponente = UsuariosRepo.obterPorEmail(p.usuarioEmail);
                const telefone = proponente ? proponente.telefone : 'N/A'; // 2. Obtém o telefone

                tableHTML += `
                    <tr>
                        <td>${p.id}</td>
                        <td>${p.data}</td>
                        <td>${p.veiculo}</td>
                        <td>${p.valorProposto}</td>
                        <td>${p.usuarioEmail}</td>
                        <td>${telefone}</td>
                        <td>${p.observacoes || 'N/A'}</td>
                    </tr>
                `;
            });

            tableHTML += `</tbody></table>`;
            propostasListDiv.innerHTML = tableHTML;
        }

        renderProposals();
    }
}};

    // =========================================================================
    // Integração com Google OAuth
    // =========================================================================
    // Permite login usando a conta Google e cria automaticamente o usuário
    // no sistema local (Local Storage) caso ainda não exista.

    window.handleCredentialResponse = function (response) {
        try {
            const token = response.credential;
            const data = decodeJwt(token); // Decodifica o token JWT enviado pelo Google

            console.log("Usuário Google:", data);

            const email = data.email;
            const nome = data.name;
            const foto = data.picture;

            // Verifica se o usuário já existe no armazenamento local
            let user = UsuariosRepo.obterPorEmail(email);

            if (!user) {
                // Caso seja o primeiro login com essa conta, cria um novo usuário
                user = {
                    id: Date.now(),
                    nome,
                    email,
                    foto,
                    password: null, // Login via Google não usa senha local
                    isAdmin: false
                };
                UsuariosRepo.adicionar(user);
            }

            // Define a sessão ativa e redireciona para a página de proposta
            Sessao.definir(user);
            IU.msg(`Bem-vindo, ${nome}!`);
            IU.navegar('proposta.html');

        } catch (err) {
            // Captura e trata qualquer erro no processo de autenticação
            console.error("Erro no login com Google:", err);
            IU.msg("Erro ao autenticar com o Google. Tente novamente.");
        }
    };

    // =========================================================================
    // Função auxiliar: decodifica o token JWT recebido do Google
    // =========================================================================
    function decodeJwt(token) {
        const base64Url = token.split('.')[1]; // Pega o payload do JWT
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    }


    // =========================================================================
    // Expor funções globais
    // =========================================================================
    // Torna funções e variáveis acessíveis no escopo global (window)
    // para uso em elementos HTML com atributos inline (onclick, onsubmit etc.)

    // --------------------------- Ações principais ----------------------------
    window.entrar = () => Paginas.login.entrar();                // Efetua login
    window.sair = () => Paginas.login.sair();                    // Faz logout
    window.salvarCadastro = () => Paginas.cadastro.salvar();     // Salva novo cadastro
    window.negocie = () => Paginas.negocie.acionar();            // Controla fluxo da página “Negocie”

    // --------------------------- Recuperação de senha ------------------------
    window.handleEmailForm = Paginas.reset.handleEmailForm;      // Etapa 1: verificação de e-mail
    window.handlePasswordForm = Paginas.reset.handlePasswordForm;// Etapa 2: redefinição da senha

    // --------------------------- Propostas -----------------------------------
    window.enviarProposta = Paginas.proposta.enviar;             // Envia proposta (mantido por compatibilidade)

    // --------------------------- Login via Google ----------------------------
    window.handleGoogleSignIn = () => IU.msg('Redirecionando para login com Google...');
    // Função placeholder — usada apenas como rótulo de integração visual

    // --------------------------- Funções auxiliares --------------------------
    // Expõe algumas funções internas para uso em testes ou scripts antigos
    window.getLoggedUser = Sessao.obter;
    window.getProposals = PropostasRepo.todas;
    window.saveProposal = PropostasRepo.adicionar;
    window.getUserByEmail = UsuariosRepo.obterPorEmail;

    // Constantes globais úteis
    window.ADMIN_EMAIL = ADMIN_EMAIL;
    window.LS_KEY_USERS = LS_KEY_USERS;

    // =========================================================================
    // FUNÇÕES GLOBAIS DE UI (COOKIES E PRIVACIDADE)
    // =========================================================================
    // Este módulo controla o aviso de cookies e o banner de política de privacidade,
    // salvando a decisão do usuário no localStorage para persistência entre sessões.


    // --------------------------- Aviso de Cookies (modo simples) ---------------------------
    // Esta primeira parte garante que o aviso de cookies apareça apenas se o usuário
    // ainda não tiver aceitado anteriormente.
    window.acceptCookies = function () {
        const cookieNotice = document.getElementById("cookieNotice");
        if (cookieNotice) {
            cookieNotice.classList.add("hidden"); // Esconde o banner
            localStorage.setItem(LS_KEY_COOKIES_ACCEPTED, "true"); // Marca aceitação no localStorage
        }
    };

    // Ao carregar a página, verifica se o usuário já aceitou os cookies
    window.addEventListener("load", () => {
        const cookiesAccepted = localStorage.getItem(LS_KEY_COOKIES_ACCEPTED);
        const cookieNotice = document.getElementById("cookieNotice");
        if (cookiesAccepted !== "true" && cookieNotice) {
            cookieNotice.classList.remove("hidden"); // Exibe o aviso se ainda não aceitou
        }
    });


    // --------------------------- Aviso de Cookies (modo completo / atualizado) ---------------------------
    // Esta segunda parte reforça a lógica e adiciona o controle da política de privacidade.
    document.addEventListener('DOMContentLoaded', () => {
        const cookieNotice = document.getElementById('cookieNotice');
        const localStorageKey = 'cookiesAccepted';

        // 1. Verifica se o usuário já aceitou os cookies
        function checkCookieAcceptance() {
            if (localStorage.getItem(localStorageKey) === 'true') {
                // Oculta o aviso se já aceitou
                if (cookieNotice) cookieNotice.classList.add('hidden');
            } else {
                // Exibe o aviso se ainda não aceitou
                if (cookieNotice) cookieNotice.classList.remove('hidden');
            }
        }

        // 2. Aceitar cookies (acionado pelo botão no banner)
        window.acceptCookies = function () {
            localStorage.setItem(localStorageKey, 'true'); // Salva aceitação
            if (cookieNotice) cookieNotice.classList.add('hidden'); // Oculta imediatamente
        };

        // --------------------------- Política de Privacidade ---------------------------
        // Exibe o banner de política de privacidade
        window.showPrivacyPolicy = function () {
            const banner = document.getElementById('privacyPolicyBanner');
            if (banner) banner.classList.add('show');
        };

        // Fecha o banner de política de privacidade
        window.closePrivacyPolicy = function () {
            const banner = document.getElementById('privacyPolicyBanner');
            if (banner) banner.classList.remove('show');
        };

        // Executa a verificação inicial ao carregar a página
        checkCookieAcceptance();
    });

    // =========================================================================
    // INICIALIZAÇÃO DA APLICAÇÃO (DOM CONTENT LOADED)
    // =========================================================================
    // Este bloco é executado assim que o DOM é carregado.
    // Ele inicializa componentes interativos da interface: abas, botões, filtros e seletor de cores.
    document.addEventListener("DOMContentLoaded", () => {
        // Tabs
        const tabs = document.querySelectorAll(".tab");
        const tabContents = document.querySelectorAll(".tab-content");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {

                // Remove estado ativo de todas as abas e conteúdos
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");

                // Ativa a aba e o conteúdo correspondentes
                tabContents.forEach(content => content.classList.remove("active"));
                const tabId = tab.getAttribute("data-tab");
                const targetContent = document.getElementById(tabId);
                if (targetContent) targetContent.classList.add("active");
            });
        });

        // =========================================================================
        // BOTÃO "ENTRAR EM CONTATO"
        // =========================================================================
        // Redireciona o usuário para a página de login ao clicar nos botões de simulação.
        document.querySelectorAll('.btn-simulate').forEach(botao => {
            botao.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        });


        // =========================================================================
        // FILTRO DE FOTOS (Galeria)
        // =========================================================================
        // Mostra apenas as imagens que pertencem à categoria selecionada.
        const filterBtns = document.querySelectorAll(".filter-btn");
        const fotoItems = document.querySelectorAll(".foto-item");
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                // Atualiza o botão ativo visualmente
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                // Obtém o filtro e aplica às imagens
                const selectedFilter = btn.getAttribute("data-filter");
                fotoItems.forEach(item => {
                    const itemCategory = item.getAttribute("data-category");
                    item.style.display = (itemCategory === selectedFilter || selectedFilter === "all") ? "block" : "none";
                });
            });
        });

        // =========================================================================
        // SELETOR DE CORES (Troca de imagens dos veículos)
        // =========================================================================
        // Permite alterar a imagem exibida no card conforme a cor selecionada.
        const colors = document.querySelectorAll(".color");
        colors.forEach(color => {
            color.addEventListener("click", function () {
                const selectedColor = this.getAttribute("data-color");
                const versaoCard = this.closest(".versao-card");
                if (versaoCard) {

                    // Oculta todas as imagens do card
                    const carImages = versaoCard.querySelectorAll(".versao-image");
                    carImages.forEach(img => img.style.display = "none");

                    // Exibe a imagem da cor selecionada
                    const targetImage = versaoCard.querySelector(`.versao-image[data-color="${selectedColor}"]`);
                    if (targetImage) targetImage.style.display = "block";

                    // Atualiza o destaque do seletor de cor ativo
                    const colorSelectors = this.parentElement.querySelectorAll(".color");
                    colorSelectors.forEach(s => s.classList.remove("active"));
                    this.classList.add("active");
                }
            });
        });

        // =========================================================================
        // INICIALIZAÇÕES AUTOMÁTICAS DE PÁGINAS
        // =========================================================================
        // Executa funções específicas conforme o conteúdo da página atual.
        // A detecção é feita pela presença de elementos HTML identificadores.

        if (document.getElementById('propostaForm'))
            Paginas.proposta.carregar(); // Página de proposta

        if (document.getElementById('propostasList'))
            Paginas.admin.carregar(); // Página do administrador


        // =========================================================================
        // FORMULÁRIOS DE LOGIN E CADASTRO
        // =========================================================================
        // Intercepta o envio padrão do formulário (submit) e executa a lógica customizada.

        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Paginas.login.entrar(); // Executa tentativa de login
        });

        document.getElementById('cadastroForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            Paginas.cadastro.salvar(); // Salva novo cadastro
        });


        // =========================================================================
        // FORMULÁRIOS DE REDEFINIÇÃO DE SENHA
        // =========================================================================
        // Controla o fluxo de redefinição (enviar e confirmar nova senha).

        document.getElementById('emailForm')?.addEventListener('submit', Paginas.reset.handleEmailForm);
        document.getElementById('passwordForm')?.addEventListener('submit', Paginas.reset.handlePasswordForm);


        // =========================================================================
        // BOTÃO DE LOGOUT (SAIR)
        // =========================================================================
        // Permite encerrar a sessão do usuário nas páginas principais.

        document.getElementById('logoutButton')?.addEventListener('click', Paginas.login.sair);


        // =========================================================================
        // LÓGICA DO BANNER DE PRIVACIDADE E ESTADO DE LOGIN
        // =========================================================================
        // Esta seção gerencia o comportamento do banner de privacidade e
        // adapta o menu de navegação conforme o estado do usuário (logado ou não).

        // -------------------------------------------------------------------------
        // Exibe o banner de privacidade ao clicar em links do tipo "#privacidade"
        // -------------------------------------------------------------------------
        document.querySelectorAll('a[href="#privacidade"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.showPrivacyPolicy(); // Função global definida na seção de cookies
            });
        });

        // -------------------------------------------------------------------------
        // Ajuste dinâmico do menu conforme o usuário logado
        // -------------------------------------------------------------------------
        const user = Sessao.obter(); // Recupera usuário atual da sessão
        const loginLink = document.getElementById('loginLink');
        const logoutButton = document.getElementById('logoutButton');

        if (user) {
            // Usuário autenticado
            if (loginLink) {
                // Define destino e rótulo conforme o tipo de usuário
                loginLink.textContent = user.isAdmin ? 'Admin' : 'Proposta';
                loginLink.href = user.isAdmin ? 'admin.html' : 'proposta.html';
            }
            if (logoutButton) {
                logoutButton.style.display = 'inline-block'; // Exibe botão "Sair"
            }
        } else {
            // Usuário não autenticado
            if (loginLink) {
                loginLink.textContent = 'Negocie';
                loginLink.href = 'login.html';
            }
            if (logoutButton) {
                logoutButton.style.display = 'none'; // Oculta botão "Sair"
            }
        }

        // Fecha o DOMContentLoaded iniciado anteriormente
    });



})(window, document);

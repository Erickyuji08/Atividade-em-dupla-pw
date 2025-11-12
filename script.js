(function (window, document) {
    'use strict';

    // --------------------------- Constantes Globais ------------------------
    const ADMIN_EMAIL = "admin@velocityx.com"; // E-mail do administrador fixo
    const LS_KEY_USERS = 'usuarios';
    const LS_KEY_PROPOSALS = 'propostas';
    const LS_KEY_LOGGED_USER = 'loggedUser';
    const LS_KEY_COOKIES_ACCEPTED = 'cookiesAccepted';

    // --------------------------- Armazenamento -----------------------------
    const Armazenamento = {
        ler(chave, padrao = null) {
            try {
                const bruto = localStorage.getItem(chave);
                return bruto ? JSON.parse(bruto) : padrao;
            } catch {
                // Em um ambiente real, um log seria mais apropriado
                console.error('Erro ao ler o armazenamento para a chave:', chave);
                return padrao;
            }
        },
        escrever(chave, valor) { localStorage.setItem(chave, JSON.stringify(valor)); },
        remover(chave) { localStorage.removeItem(chave); }
    };

    // --------------------------- Repositório de Usuários -------------------
    const UsuariosRepo = {
        todos() {
            let users = Armazenamento.ler(LS_KEY_USERS, []);
            // Adiciona o usuário administrador fixo se não estiver presente
            if (!users.some(u => u.email === ADMIN_EMAIL)) {
                users.unshift({
                    id: 0,
                    nome: "Administrador",
                    email: ADMIN_EMAIL,
                    password: "admin", // Senha simples para o admin
                    isAdmin: true
                });
            }
            return users;
        },
        salvar(lista) {
            // Remove o admin fixo antes de salvar para evitar sobrescrever
            const usersToSave = lista.filter(u => u.email !== ADMIN_EMAIL);
            Armazenamento.escrever(LS_KEY_USERS, usersToSave);
        },
        obterPorEmail(email) {
            const alvo = (email || '').toLowerCase();
            return this.todos().find(u => (u.email || '').toLowerCase() === alvo) || null;
        },
        existe(email) { return !!this.obterPorEmail(email); },
        adicionar(user) {
            const lista = this.todos().filter(u => u.email !== ADMIN_EMAIL); // Remove admin antes de adicionar
            lista.push(user);
            this.salvar(lista);
        },
        atualizarSenha(email, novaSenha) {
            const lista = this.todos().map(u => {
                if (u.email.toLowerCase() === email.toLowerCase() && !u.isAdmin) u.password = novaSenha;
                return u;
            });
            this.salvar(lista);
        }
    };

    // --------------------------- Sessão -----------------------------------
    const Sessao = {
        definir(user) { Armazenamento.escrever(LS_KEY_LOGGED_USER, user); },
        obter() { return Armazenamento.ler(LS_KEY_LOGGED_USER, null); },
        limpar() { Armazenamento.remover(LS_KEY_LOGGED_USER); }
    };


    // --------------------------- Propostas --------------------------------
    const PropostasRepo = {
        todas() { return Armazenamento.ler(LS_KEY_PROPOSALS, []); },
        salvar(lista) { Armazenamento.escrever(LS_KEY_PROPOSALS, lista); },
        adicionar(proposta) {
            const lista = this.todas();
            lista.push(proposta);
            this.salvar(lista);
        }
    };

    // --------------------------- Interface --------------------------------
    const IU = {
        navegar(url) { window.location.href = url; },
        msg(texto) { alert(texto); }
    };

    // --------------------------- Páginas ----------------------------------
    const Paginas = {
        negocie: {
            acionar() {
                const user = Sessao.obter();
                const usuarios = UsuariosRepo.todos();
                if (user) {
                    IU.navegar('proposta.html');
                } else if (usuarios.length === 1 && usuarios[0].isAdmin) { // Apenas o admin fixo
                    IU.navegar('cadastro.html');
                } else {
                    IU.navegar('login.html');
                }
            }
        },

        login: {
            entrar() {
                const email = (document.getElementById('email')?.value || '').trim();
                const senha = document.getElementById('password')?.value || '';
                if (!email || !senha) return IU.msg('Preencha e-mail e senha.');

                const user = UsuariosRepo.obterPorEmail(email);
                if (!user || user.password !== senha) return IU.msg('E-mail ou senha incorretos.');

                Sessao.definir(user);
                IU.msg('Login realizado com sucesso!');
                if (user.isAdmin) {
                    IU.navegar('admin.html');
                } else {
                    IU.navegar('proposta.html');
                }
            },
            sair() { Sessao.limpar(); IU.navegar('login.html'); }
        },

        cadastro: {
            salvar() {
                const nome = (document.getElementById('nome')?.value || '').trim();
                const email = (document.getElementById('email')?.value || '').trim();
                const telefone = (document.getElementById('telefone')?.value || '').trim();
                const dataNascimento = document.getElementById('dataNascimento')?.value;
                const cep = (document.getElementById('cep')?.value || '').trim();
                const senha = document.getElementById('password')?.value || '';
                const confirmar = document.getElementById('confirmPassword')?.value || '';

                if (!nome || !email || !telefone || !dataNascimento || !cep || !senha || !confirmar)
                    return IU.msg('Preencha todos os campos.');

                if (senha !== confirmar) return IU.msg('As senhas não coincidem.');
                if (UsuariosRepo.existe(email)) return IU.msg('E-mail já cadastrado.');

                const novo = { id: Date.now(), nome, email, telefone, dataNascimento, cep, password: senha, isAdmin: false };
                UsuariosRepo.adicionar(novo);
                Sessao.definir(novo);
                IU.msg('Cadastro realizado com sucesso!');
                IU.navegar('proposta.html');
            }
        },

        reset: {
            // Lógica de redefinição de senha 
            handleEmailForm: (e) => {
                e.preventDefault();
                const email = document.getElementById("resetEmail").value;
                const user = UsuariosRepo.obterPorEmail(email);
                const step1 = document.getElementById("step1");
                const step2 = document.getElementById("step2");
                const formTitle = document.getElementById("formTitle");
                const messageContainer = document.getElementById("messageContainer");

                function showMessage(text, type) {
                    messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
                }

                if (user && !user.isAdmin) {
                    // E-mail encontrado, avança para o passo 2
                    localStorage.setItem('resetEmail', email); // Usando localStorage temporário
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
            handlePasswordForm: (e) => {
                e.preventDefault();
                const confirmedEmail = localStorage.getItem('resetEmail');
                const newPassword = document.getElementById("newPassword").value;
                const confirmPassword = document.getElementById("confirmPassword").value;
                const messageContainer = document.getElementById("messageContainer");

                function showMessage(text, type) {
                    messageContainer.innerHTML = `<div class="message ${type}">${text}</div>`;
                }

                if (newPassword !== confirmPassword) {
                    showMessage("As senhas não coincidem.", "error");
                    return;
                }

                if (newPassword.length < 6) {
                    showMessage("A senha deve ter pelo menos 6 caracteres.", "error");
                    return;
                }

                // Lógica de redefinição no Local Storage
                let users = UsuariosRepo.todos();
                const userToUpdate = users.find(u => u.email === confirmedEmail);

                if (userToUpdate) {
                    userToUpdate.password = newPassword;
                    UsuariosRepo.atualizarSenha(confirmedEmail, newPassword);

                    showMessage("Senha redefinida com sucesso! Você será redirecionado para o login.", "success");

                    // Redireciona para o login após um pequeno atraso
                    setTimeout(() => {
                        localStorage.removeItem('resetEmail');
                        IU.navegar("login.html");
                    }, 2000);
                } else {
                    showMessage("Erro ao redefinir a senha. Tente novamente.", "error");
                }
            }
        },

        proposta: {
            // Lógica de carregamento e envio de proposta 
            VEHICLES: [
                { name: "Sport", image: "imagens/sport_branco.png" },
                { name: "Elite", image: "imagens/elite_branco.png" },
                { name: "Premium", image: "imagens/premium_branco.png" }
            ],

            carregar: () => {
                const user = Sessao.obter();
                const propostaForm = document.getElementById("propostaForm");
                const userInfoDiv = document.getElementById("userInfo");
                const vehicleSelectionDiv = document.getElementById("vehicleSelection");
                const veiculoInput = document.getElementById("veiculo");

                // 1. Proteção de Rota: Redireciona se não estiver logado
                if (!user) {
                    IU.msg("Você precisa estar logado para enviar uma proposta.");
                    IU.navegar("login.html");
                    return;
                }

                // 2. Exibir informações do usuário logado
                if (userInfoDiv) {
                    userInfoDiv.innerHTML = `
                        <p><strong>Usuário Logado:</strong> ${user.email}</p>
                        <p><strong>Status:</strong> ${user.isAdmin ? 'Administrador' : 'Usuário Comum'}</p>
                    `;
                }

                // 3. Renderiza os cards de veículos
                if (vehicleSelectionDiv) {
                    Paginas.proposta.VEHICLES.forEach(vehicle => {
                        const card = document.createElement("div");
                        card.className = "vehicle-card";
                        card.setAttribute("data-vehicle", vehicle.name);
                        card.innerHTML = `
                            <img src="${vehicle.image}" alt="${vehicle.name}">
                            <h4>${vehicle.name}</h4>
                        `;

                        card.addEventListener("click", () => {
                            // Remove a seleção de todos os cards
                            document.querySelectorAll(".vehicle-card").forEach(c => c.classList.remove("selected"));
                            // Adiciona a seleção ao card clicado
                            card.classList.add("selected");
                            // Atualiza o valor do input hidden
                            if (veiculoInput) veiculoInput.value = vehicle.name;
                        });

                        vehicleSelectionDiv.appendChild(card);
                    });
                }

                // 4. Lógica de Envio de Proposta
                if (propostaForm) {
                    propostaForm.addEventListener("submit", Paginas.proposta.enviar);
                }
            },

            enviar: (e) => {
                e.preventDefault();

                const user = Sessao.obter();
                const veiculo = document.getElementById("veiculo")?.value;
                const valorProposto = document.getElementById("valorProposto")?.value;
                const observacoes = document.getElementById("observacoes")?.value;

                if (!veiculo) {
                    IU.msg("Por favor, selecione um veículo.");
                    return;
                }

                if (!valorProposto) {
                    IU.msg("Por favor, informe o valor proposto.");
                    return;
                }

                // Cria o objeto da proposta
                const novaProposta = {
                    id: Date.now(), // ID único baseado no timestamp
                    data: new Date().toLocaleString('pt-BR'),
                    veiculo: veiculo,
                    valorProposto: `R$ ${parseFloat(valorProposto).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    observacoes: observacoes,
                    usuarioEmail: user.email,
                    usuarioIsAdmin: user.isAdmin
                };

                // Salva a proposta no Local Storage
                PropostasRepo.adicionar(novaProposta);

                IU.msg("Proposta enviada com sucesso! Agradecemos seu interesse.");
                // Redireciona para a tela inicial
                IU.navegar("index.html");
            }
        },

        admin: {
            // Lógica de carregamento de propostas 
            carregar: () => {
                const user = Sessao.obter();
                const propostasListDiv = document.getElementById("propostasList");

                // 1. Proteção de Rota: Redireciona se não for admin
                if (!user || !user.isAdmin) {
                    IU.msg('Acesso restrito ao administrador.');
                    IU.navegar('login.html');
                    return;
                }

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
                                    <th>Observações</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    proposals.forEach(proposta => {
                        tableHTML += `
                            <tr>
                                <td>${proposta.id}</td>
                                <td>${proposta.data}</td>
                                <td>${proposta.veiculo}</td>
                                <td>${proposta.valorProposto}</td>
                                <td>${proposta.usuarioEmail}</td>
                                <td>${proposta.observacoes || 'N/A'}</td>
                            </tr>
                        `;
                    });

                    tableHTML += `
                            </tbody>
                        </table>
                    `;

                    propostasListDiv.innerHTML = tableHTML;
                }

                // Renderiza as propostas ao carregar a página
                renderProposals();
            }
        }
    };

    // --------------------------- Expor global ------------------------------
    window.entrar = () => Paginas.login.entrar();
    window.sair = () => Paginas.login.sair();
    window.salvarCadastro = () => Paginas.cadastro.salvar();
    window.handleEmailForm = Paginas.reset.handleEmailForm; // Nova função para o formulário de e-mail
    window.handlePasswordForm = Paginas.reset.handlePasswordForm; // Nova função para o formulário de senha
    window.enviarProposta = Paginas.proposta.enviar; // Não é mais usado diretamente, mas mantido por segurança
    window.negocie = () => Paginas.negocie.acionar();
    window.handleGoogleSignIn = () => IU.msg('Redirecionando para login com Google...'); // Função placeholder

    // Funções auxiliares para scripts inline que foram removidos
    window.getLoggedUser = Sessao.obter;
    window.getProposals = PropostasRepo.todas;
    window.saveProposal = PropostasRepo.adicionar;
    window.getUserByEmail = UsuariosRepo.obterPorEmail;
    window.ADMIN_EMAIL = ADMIN_EMAIL;
    window.LS_KEY_USERS = LS_KEY_USERS;

    // --------------------------- Extras ------------------------------------
    // Cookies
    window.acceptCookies = function () {
        const cookieNotice = document.getElementById("cookieNotice");
        if (cookieNotice) {
            cookieNotice.classList.add("hidden");
            localStorage.setItem(LS_KEY_COOKIES_ACCEPTED, "true");
        }
    };

    window.addEventListener("load", () => {
        const cookiesAccepted = localStorage.getItem(LS_KEY_COOKIES_ACCEPTED);
        const cookieNotice = document.getElementById("cookieNotice");
        if (cookiesAccepted !== "true" && cookieNotice) {
            cookieNotice.classList.remove("hidden");
        }
    });

    document.addEventListener('DOMContentLoaded', (event) => {
        const cookieNotice = document.getElementById('cookieNotice');
        const localStorageKey = 'cookiesAccepted';

        // 1. Função para verificar se o usuário já aceitou os cookies
        function checkCookieAcceptance() {
            // Verifica se a chave de aceitação existe no localStorage
            if (localStorage.getItem(localStorageKey) === 'true') {
                // Se aceitou, oculta o aviso de cookies
                if (cookieNotice) {
                    cookieNotice.classList.add('hidden');
                }
            } else {
                // Se não aceitou, garante que o aviso esteja visível (removendo a classe 'hidden' se existir)
                if (cookieNotice) {
                    cookieNotice.classList.remove('hidden');
                }
            }
        }

        // 2. Função para aceitar os cookies (chamada pelo botão no HTML)
        window.acceptCookies = function () {
            // Define a chave no localStorage para indicar que os cookies foram aceitos
            localStorage.setItem(localStorageKey, 'true');

            // Oculta o aviso imediatamente
            if (cookieNotice) {
                cookieNotice.classList.add('hidden');
            }
        };

        // Executa a verificação ao carregar a página
        checkCookieAcceptance();
    });

    //Tabs / Filtro / Seletor de Cores
    document.addEventListener("DOMContentLoaded", () => {
        // Tabs
        const tabs = document.querySelectorAll(".tab");
        const tabContents = document.querySelectorAll(".tab-content");
        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                tabs.forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                tabContents.forEach(content => content.classList.remove("active"));
                const tabId = tab.getAttribute("data-tab");
                const targetContent = document.getElementById(tabId);
                if (targetContent) targetContent.classList.add("active");
            });
        });

        //Botao de entrar em contato
        document.querySelectorAll('.btn-simulate').forEach(botao => {
            botao.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        });


        // Filtro de fotos
        const filterBtns = document.querySelectorAll(".filter-btn");
        const fotoItems = document.querySelectorAll(".foto-item");
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const selectedFilter = btn.getAttribute("data-filter");
                fotoItems.forEach(item => {
                    const itemCategory = item.getAttribute("data-category");
                    item.style.display = (itemCategory === selectedFilter || selectedFilter === "all") ? "block" : "none";
                });
            });
        });

        // Seletor de cores
        const colors = document.querySelectorAll(".color");
        colors.forEach(color => {
            color.addEventListener("click", function () {
                const selectedColor = this.getAttribute("data-color");
                const versaoCard = this.closest(".versao-card");
                if (versaoCard) {
                    const carImages = versaoCard.querySelectorAll(".versao-image");
                    carImages.forEach(img => img.style.display = "none");
                    const targetImage = versaoCard.querySelector(`.versao-image[data-color="${selectedColor}"]`);
                    if (targetImage) targetImage.style.display = "block";
                    const colorSelectors = this.parentElement.querySelectorAll(".color");
                    colorSelectors.forEach(s => s.classList.remove("active"));
                    this.classList.add("active");
                }
            });
        });

        // Inicializações automáticas de páginas
        if (document.getElementById('propostaForm')) Paginas.proposta.carregar();
        if (document.getElementById('propostasList')) Paginas.admin.carregar();

        // Lógica de submit para login e cadastro
        document.getElementById('loginForm')?.addEventListener('submit', (e) => { e.preventDefault(); Paginas.login.entrar(); });
        document.getElementById('cadastroForm')?.addEventListener('submit', (e) => { e.preventDefault(); Paginas.cadastro.salvar(); });

        // Lógica de submit para reset_password
        document.getElementById('emailForm')?.addEventListener('submit', Paginas.reset.handleEmailForm);
        document.getElementById('passwordForm')?.addEventListener('submit', Paginas.reset.handlePasswordForm);

        // Lógica de logout para index.html e admin.html
        document.getElementById('logoutButton')?.addEventListener('click', Paginas.login.sair);

       

        // Atualiza o link de login/logout na index.html
        const user = Sessao.obter();
        const loginLink = document.getElementById('loginLink');
        const logoutButton = document.getElementById('logoutButton');

        if (user) {
            if (loginLink) {
                loginLink.textContent = user.isAdmin ? 'Admin' : 'Proposta';
                loginLink.href = user.isAdmin ? 'admin.html' : 'proposta.html';
            }
            if (logoutButton) {
                logoutButton.style.display = 'inline-block';
            }
        } else {
            if (loginLink) {
                loginLink.textContent = 'Negocie';
                loginLink.href = 'login.html';
            }
            if (logoutButton) {
                logoutButton.style.display = 'none';
            }
        }
    });

    // ------------------- Integração com Google OAuth -------------------
    window.handleCredentialResponse = function (response) {
        try {
            const token = response.credential;
            const data = decodeJwt(token);

            console.log("Usuário Google:", data);

            const email = data.email;
            const nome = data.name;
            const foto = data.picture;

            // Verifica se o usuário já existe
            let user = UsuariosRepo.obterPorEmail(email);

            if (!user) {
                // Cria automaticamente o usuário Google no sistema local
                user = {
                    id: Date.now(),
                    nome: nome,
                    email: email,
                    foto: foto,
                    password: null,
                    isAdmin: false
                };
                UsuariosRepo.adicionar(user);
            }

            // Cria sessão local
            Sessao.definir(user);

            IU.msg(`Bem-vindo, ${nome}!`);
            IU.navegar('proposta.html');
        } catch (err) {
            console.error("Erro no login com Google:", err);
            IU.msg("Erro ao autenticar com o Google. Tente novamente.");
        }
    };

    function decodeJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    }

})(window, document);

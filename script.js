/* =========================================================
   UNICIVE · ÚLTIMA CHANCE — venda de 03/11 às 10h até 10/11 às 23h59

   Duas metades:
   1. A CENA — abertura (vidro, raios, explosão), fogo e raios ambientes,
      contagem regressiva, pavio e as fases antes / ao vivo / depois.
   2. A CAPTURA — lista VIP: formulário → Google Sheets → grupo do
      WhatsApp. É o mesmo fluxo da ../livepmpe, e as referências §x.y
      apontam para ../../pages captura leads/pmpe/TRACKING.md.
   ========================================================= */
(function () {
  "use strict";

  /* =========================================================
     CONFIG — os únicos valores específicos desta página
     ========================================================= */
  var CONFIG = {
    /* A OFERTA: de 03/11, 10h, até 10/11, 23h59. A página só vai ao ar quando as
       vendas começam, então o cronômetro conta sempre até o `fim`. O
       `inicio` fica só como referência (agenda/registro). */
    inicio: "2026-11-03T10:00:00-03:00",
    fim:    "2026-11-10T23:59:59-03:00",

    /* Link do checkout de matrícula da Unicive. Todos os botões
       "Garantir minha matrícula" usam este valor (com as UTMs da visita). */
    checkout: "https://unicv.checkout.cppem.com.br/pay/matricula-unicive-ead-mega-desconto-de-ultima-chance",

    /* Mensalidade da Última Chance: de R$ 250 por R$ 149,90 (o "de" fica
       no HTML). */
    mensalidade: "R$ 149,90",

    /* Restos da página de cadastro, mantidos para o script compartilhado
       funcionar; esta página não tem formulário nem pavio. */
    pavioInicio: "2026-10-16T00:00:00-03:00",
    sheetBase: "",
    sheetAba:  "",
    grupoWhatsApp: "",
    youtubeLive: "",
    youtubeCanal: "https://www.youtube.com/@cppemconcursos",
    fogoAmbiente: false,
    raiosAmbiente: false,

    pagina:  "Black Friday Unicive 2026 — venda",
    produto: "MATRICULA BLACK FRIDAY UNICIVE"
  };

  var SHEET_URL = CONFIG.sheetBase + "?aba=" + CONFIG.sheetAba;

  /* =========================================================
     Tracking — PixelX / GTM

     REGRA DE OURO: deve existir EXATAMENTE UM emissor de Lead.

     LEAD_MODE = "site" (Modelo B, §5): quem dispara o Lead é este arquivo.
       A barreira de submit corta a propagação, então uma eventual regra de
       SUBMIT no painel fica inerte e não duplica.
       ⚠ Uma regra de CLIQUE no painel ainda duplicaria (§10.3): não cadastre
       o id "bf-unicive-submit" como conversão por clique na PixelX.

     LEAD_MODE = "painel" (Modelo A): o painel dispara, o site não. Exige que
       o id do <form> ("bf-unicive-form") esteja cadastrado no painel da conta.
     ========================================================= */
  var LEAD_MODE   = "site";        // "site" (Modelo B) | "painel" (Modelo A)
  var PHONE_MODE  = "celular_br";  // "celular_br" | "celular_ou_fixo_br" | "internacional"
  var REDIRECT_DELAY_MS = 1500;    // §7.6 — abaixo de ~1s começa a perder eventos
  var PIXEL_TIMEOUT_MS  = 3000;    // §8.5 — espera o pixel_x_app ficar pronto

  var raiz = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var INICIO = new Date(CONFIG.inicio).getTime();
  var FIM    = new Date(CONFIG.fim).getTime();
  var PAVIO  = new Date(CONFIG.pavioInicio).getTime();

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function rand(a, b) { return a + Math.random() * (b - a); }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  /* =========================================================
     UTMs — first touch (mesmo motivo da livepmpe: a UTM só existe na URL
     do primeiro acesso, e o submit pode acontecer depois de um reload)
     ========================================================= */
  var UTM_CAMPOS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];

  (function guardarUTMs() {
    var qs = new URLSearchParams(window.location.search);
    UTM_CAMPOS.forEach(function (chave) {
      var valor = qs.get(chave);
      if (!valor) return;
      try { sessionStorage.setItem(chave, valor); } catch (e) { /* sem storage */ }
    });
  })();

  function utm(chave) {
    var daUrl = new URLSearchParams(window.location.search).get(chave);
    if (daUrl) return daUrl;
    try { return sessionStorage.getItem(chave) || ""; } catch (e) { return ""; }
  }

  /* dataLayer — eventos de comportamento, que NÃO são Lead */
  function track(evento, dados) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: evento, pagina: CONFIG.pagina }, dados || {}));
  }

  /* =========================================================
     LINKS DO YOUTUBE
     ========================================================= */
  (function linksYoutube() {
    var aoVivo = CONFIG.youtubeLive || (CONFIG.youtubeCanal + "/live");
    $$("[data-youtube-live]").forEach(function (a) { a.href = aoVivo; });

    if (!CONFIG.youtubeLive) return;
    $$("[data-youtube-canal]").forEach(function (a) {
      a.href = CONFIG.youtubeLive;
      var rotulo = a.querySelector("span");
      if (rotulo) rotulo.textContent = "Ativar lembrete";
    });
  })();

  /* =========================================================
     CHECKOUT E MENSALIDADE
     Os botões de compra recebem o link do CONFIG; as UTMs da visita vão
     junto, para o checkout saber de onde veio a venda.
     ========================================================= */
  (function checkout() {
    var botoes = $$("[data-checkout]");
    if (!CONFIG.checkout) {
      console.warn("[checkout] CONFIG.checkout vazio: os botões de matrícula ainda não têm destino.");
      botoes.forEach(function (a) { a.removeAttribute("target"); a.href = "#oferta"; });
    } else {
      var url = CONFIG.checkout;
      try {
        var u = new URL(url), qs = new URLSearchParams(window.location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
          var v = qs.get(k); if (!v) { try { v = sessionStorage.getItem(k); } catch (e) {} }
          if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);
        });
        url = u.toString();
      } catch (e) {}
      botoes.forEach(function (a) { a.href = url; });
    }
    botoes.forEach(function (a) {
      a.addEventListener("click", function () {
        track("clique_checkout", { cta: a.getAttribute("data-cta") || "", valor: 69.90 });
      });
    });

    if (CONFIG.mensalidade) {
      $$("[data-mensalidade]").forEach(function (el) { el.classList.remove("is-segredo"); });
      $$("[data-mensalidade-valor]").forEach(function (el) { el.textContent = CONFIG.mensalidade; el.removeAttribute("aria-label"); });
      $$("[data-mensalidade-nota]").forEach(function (el) { el.remove(); });
    }
  })();

  /* =========================================================
     SALVAR NA AGENDA — Google e .ics (iPhone / Outlook)
     ========================================================= */
  (function agenda() {
    function utc(ms) { return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }

    var titulo = "Black Friday Unicive · ao vivo no YouTube";
    var link   = CONFIG.youtubeLive || CONFIG.youtubeCanal;
    var desc   = "A live com a condição do ano para a sua graduação na Unicive. Assista em " + link;
    var fimAgenda = INICIO + 2 * 3600e3;

    var google = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" + encodeURIComponent(titulo) +
      "&dates=" + utc(INICIO) + "/" + utc(fimAgenda) +
      "&details=" + encodeURIComponent(desc) +
      "&location=" + encodeURIComponent(link);

    var ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CPPEM//Black Friday//PT-BR", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:black-friday-unicive-2026@cppem.com.br",
      "DTSTAMP:" + utc(Date.now()),
      "DTSTART:" + utc(INICIO),
      "DTEND:" + utc(fimAgenda),
      "SUMMARY:" + titulo,
      "DESCRIPTION:" + desc,
      "LOCATION:" + link,
      "URL:" + link,
      "BEGIN:VALARM", "TRIGGER:-PT30M", "ACTION:DISPLAY", "DESCRIPTION:A Black Friday Unicive começa em 30 minutos", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"
    ].join("\r\n");

    $$('[data-agenda="google"]').forEach(function (a) { a.href = google; });
    $$('[data-agenda="ics"]').forEach(function (a) {
      a.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
    });
    $$("[data-agenda]").forEach(function (a) {
      a.addEventListener("click", function () { track("salvar_agenda", { tipo: a.getAttribute("data-agenda") }); });
    });
  })();

  /* =========================================================
     FASE + CONTAGEM + PAVIO

     A página tem três estados e troca sozinha, sem ninguém abrir o arquivo
     na noite da live:
       antes    → contagem, "Entrar na lista VIP"
       ao-vivo  → "Assistir ao vivo agora"
       depois   → "A live acabou, veja a gravação"
     Todo elemento com data-fase-so="x" só aparece na fase x.
     ========================================================= */
  var faseAtual = "";
  var contadores = $$(".cdown");
  var dockTempo = document.getElementById("dockTempo");
  var formTempo = document.getElementById("formTempo");
  var corda = document.getElementById("pavioCorda");
  var faisca = document.getElementById("pavioFaisca");

  function dois(n) { return (n < 10 ? "0" : "") + n; }

  function aplicarFase(fase) {
    if (fase === faseAtual) return;
    faseAtual = fase;
    raiz.setAttribute("data-fase", fase);
    $$("[data-fase-so]").forEach(function (el) {
      el.hidden = el.getAttribute("data-fase-so") !== fase;
    });
  }

  function tique() {
    var agora = Date.now();
    /* A página só é publicada quando as vendas começam: não existe fase
       "antes". O cronômetro conta sempre até o FIM da oferta. */
    var falta = Math.max(0, FIM - agora);

    aplicarFase(agora < FIM ? "ao-vivo" : "depois");

    /* gatilho automático: nas últimas 48h a página passa a gritar "últimas horas" */
    var ultimas = falta > 0 && falta <= 48 * 3600e3;
    if (ultimas !== raiz.classList.contains("is-ultimas-horas")) {
      raiz.classList.toggle("is-ultimas-horas", ultimas);
      $$("[data-gatilho]").forEach(function (el) { el.textContent = ultimas ? "Últimas horas" : "Última oferta possível"; });
      $$("[data-chamado]").forEach(function (el) { el.textContent = ultimas ? "Últimas horas! Garanta antes que acabe:" : "Corra! Seu desconto de 82% acaba em:"; });
    }

    var s = Math.floor(falta / 1000);
    var v = {
      d: dois(Math.floor(s / 86400)),
      h: dois(Math.floor(s % 86400 / 3600)),
      m: dois(Math.floor(s % 3600 / 60)),
      s: dois(s % 60)
    };
    contadores.forEach(function (c) {
      $$("[data-c]", c).forEach(function (b) {
        var k = b.getAttribute("data-c");
        if (b.textContent !== v[k]) b.textContent = v[k];
      });
    });

    var curto = (Number(v.d) ? Number(v.d) + "d " : "") + v.h + ":" + v.m + ":" + v.s;
    var resumo = faseAtual === "ao-vivo" ? "finaliza em " + curto : "oferta encerrada";
    $$("[data-tempo-curto]").forEach(function (el) { el.textContent = curto; });
    if (dockTempo) dockTempo.textContent = resumo;
    if (formTempo) formTempo.textContent = resumo;

    /* A corda é um <path>: mostra só o trecho do gargalo até "resta" e a
       faísca vai para o ponto exato da curva nesse comprimento. */
    if (corda && faisca) {
      var total = Math.max(1, INICIO - PAVIO);
      var resta = Math.min(1, Math.max(0, falta / total));
      var L = corda.getTotalLength();
      var pt = corda.getPointAtLength(L * resta);
      corda.style.strokeDasharray = L;
      corda.style.strokeDashoffset = L * (1 - resta);
      faisca.setAttribute("transform", "translate(" + pt.x.toFixed(1) + " " + pt.y.toFixed(1) + ")");
      faisca.style.display = resta > 0 ? "" : "none";
    }
  }

  tique();
  setInterval(tique, 1000);

  /* =========================================================
     REVEAL AO ROLAR
     ========================================================= */
  (function reveal() {
    var itens = $$("[data-reveal]");
    if (!("IntersectionObserver" in window) || reduced) {
      itens.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: .12 });

    /* cards lado a lado entram em cascata, não todos no mesmo frame */
    itens.forEach(function (el) {
      var irmaos = el.parentElement ? $$(":scope > [data-reveal]", el.parentElement) : [];
      var i = irmaos.indexOf(el);
      if (i > 0) el.style.transitionDelay = (i * .08) + "s";
      io.observe(el);
    });
  })();

  /* =========================================================
     A CENA — canvases do hero

     Três camadas, de baixo para cima:
       #vidro  a tela preta da abertura: trincas e, na explosão, os cacos
       #fogo   chamas no pé do hero, brasas subindo, faíscas e bola de fogo
       #raios  os raios (impacto do FRIDAY e, depois, os ambientes)
     Um loop só desenha as três, e ele dorme quando o hero sai da tela.
     ========================================================= */
  var hero    = document.getElementById("topo");
  var cvVidro = document.getElementById("vidro");
  var cvFogo  = document.getElementById("fogo");
  var cvRaios = document.getElementById("raios");
  var clarao  = document.getElementById("clarao");

  var cena = { W: 0, H: 0, DPR: 1, visivel: true };
  var ctxVidro = cvVidro.getContext("2d");
  var ctxFogo  = cvFogo.getContext("2d");
  var ctxRaios = cvRaios.getContext("2d");

  function medir() {
    cena.W = hero.clientWidth;
    cena.H = hero.clientHeight;
    /* DPR limitado: em tela 3x o canvas cheio custa 9x os pixels por um
       ganho que não se vê em partícula borrada. */
    cena.DPR = Math.min(window.devicePixelRatio || 1, cena.W < 700 ? 1.25 : 1.5);
    [[cvVidro, ctxVidro], [cvFogo, ctxFogo], [cvRaios, ctxRaios]].forEach(function (p) {
      p[0].width  = Math.round(cena.W * cena.DPR);
      p[0].height = Math.round(cena.H * cena.DPR);
      p[1].setTransform(cena.DPR, 0, 0, cena.DPR, 0, 0);
    });
  }

  /* centro de um elemento em coordenadas do hero */
  function centro(el) {
    var r = el.getBoundingClientRect(), h = hero.getBoundingClientRect();
    return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2, w: r.width, h: r.height };
  }

  /* ---------- sprites de brilho (gerados uma vez) ----------
     Desenhar um gradiente radial por partícula a cada frame é o que mata
     o celular. Pintamos cada cor uma vez num canvas pequeno e depois só
     carimbamos com drawImage. */
  function sprite(r, g, b) {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var x = c.getContext("2d");
    var gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",1)");
    gr.addColorStop(.35, "rgba(" + r + "," + g + "," + b + ",.55)");
    gr.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
    x.fillStyle = gr;
    x.fillRect(0, 0, 64, 64);
    return c;
  }
  /* fogo dourado: do branco quente ao bronze — a paleta da página não tem vermelho */
  var CORES_FOGO = [sprite(255, 250, 236), sprite(255, 228, 160), sprite(238, 186, 96), sprite(186, 128, 52), sprite(92, 62, 30)];
  var SPRITE_BRASA  = sprite(255, 214, 140);
  var SPRITE_FUMACA = sprite(40, 38, 42);

  /* =========================================================
     FOGO
     ========================================================= */
  var fogo = {
    p: [],
    calor: 0,          // 0 = sem chama no pé do hero (abertura); 1 = aceso
    acumChama: 0,
    acumBrasa: 0,
    MAX: 900,

    add: function (q) { if (this.p.length < this.MAX) this.p.push(q); },

    faiscas: function (x, y, forca) {
      var n = Math.round(110 * forca);
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, v = rand(260, 1100) * forca;
        this.add({ t: "faisca", x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, vida: 0, max: rand(.35, 1.1) });
      }
    },

    explosao: function (x, y, forca) {
      var i, a, v;
      this.faiscas(x, y, 1.2 * forca);
      for (i = 0; i < 46 * forca; i++) {
        a = Math.random() * Math.PI * 2; v = rand(60, 520);
        this.add({ t: "bola", x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .8, r: rand(26, 70), vida: 0, max: rand(.45, 1.05) });
      }
      for (i = 0; i < 22 * forca; i++) {
        a = Math.random() * Math.PI * 2; v = rand(40, 240);
        this.add({ t: "fumaca", x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, r: rand(40, 90), vida: 0, max: rand(1.4, 2.6) });
      }
    },

    passo: function (dt, t) {
      var W = cena.W, H = cena.H, ctx = ctxFogo, i, q, k, a;

      /* nascimento: chamas no pé do hero e brasas pela tela */
      if (this.calor > 0 && cena.visivel && !reduced) {
        this.acumChama += dt * this.calor * Math.max(30, W / 9);
        while (this.acumChama >= 1) {
          this.acumChama--;
          this.add({ t: "chama", x: Math.random() * W, y: H + 24, vx: rand(-14, 14), vy: -rand(70, 175),
                     r: rand(24, 58) * (W < 700 ? .8 : 1), vida: 0, max: rand(.8, 1.6), fase: Math.random() * 6 });
        }
        this.acumBrasa += dt * this.calor * (W < 700 ? 7 : 14);
        while (this.acumBrasa >= 1) {
          this.acumBrasa--;
          this.add({ t: "brasa", x: Math.random() * W, y: H * rand(.55, 1.05), vx: rand(-10, 10), vy: -rand(22, 80),
                     r: rand(1, 2.6), vida: 0, max: rand(3.5, 7.5), fase: Math.random() * 6 });
        }
      }

      ctx.clearRect(0, 0, W, H);

      /* 1ª passada: fumaça, com composição normal (ela escurece) */
      ctx.globalCompositeOperation = "source-over";
      for (i = 0; i < this.p.length; i++) {
        q = this.p[i];
        if (q.t !== "fumaca") continue;
        k = q.vida / q.max;
        ctx.globalAlpha = Math.sin(k * Math.PI) * .35;
        var rf = q.r * (1 + k * 1.6);
        ctx.drawImage(SPRITE_FUMACA, q.x - rf, q.y - rf, rf * 2, rf * 2);
      }

      /* 2ª passada: tudo que é luz soma ("lighter") */
      ctx.globalCompositeOperation = "lighter";
      for (i = this.p.length - 1; i >= 0; i--) {
        q = this.p[i];
        q.vida += dt;
        if (q.vida >= q.max) { this.p.splice(i, 1); continue; }
        k = q.vida / q.max;

        if (q.t === "chama") {
          q.x += (q.vx + Math.sin(t * 3 + q.fase) * 18) * dt;
          q.y += q.vy * dt;
          var rc = q.r * (1 - k * .55);
          ctx.globalAlpha = Math.pow(1 - k, 1.3) * .5 * this.calor;
          ctx.drawImage(CORES_FOGO[Math.min(4, Math.floor(k * 5))], q.x - rc, q.y - rc, rc * 2, rc * 2);

        } else if (q.t === "brasa") {
          q.x += (q.vx + Math.sin(t * 1.7 + q.fase) * 22) * dt;
          q.y += q.vy * dt;
          a = Math.sin(k * Math.PI) * (.55 + .45 * Math.sin(t * 9 + q.fase * 3));
          ctx.globalAlpha = Math.max(0, a);
          var rb = q.r * 5;
          ctx.drawImage(SPRITE_BRASA, q.x - rb, q.y - rb, rb * 2, rb * 2);

        } else if (q.t === "faisca") {
          q.vx *= 1 - 1.6 * dt; q.vy *= 1 - 1.6 * dt;
          q.vy += 520 * dt;
          q.x += q.vx * dt; q.y += q.vy * dt;
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = k < .3 ? "#fffaf0" : k < .6 ? "#f3dca4" : "#c9a058";
          ctx.lineWidth = 1.8 * (1 - k * .6);
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(q.x - q.vx * .028, q.y - q.vy * .028);
          ctx.stroke();

        } else if (q.t === "bola") {
          q.vx *= 1 - 2.6 * dt; q.vy *= 1 - 2.6 * dt;
          q.vy -= 60 * dt;   // o ar quente sobe
          q.x += q.vx * dt; q.y += q.vy * dt;
          var rr = q.r * (1 + k * 1.4);
          ctx.globalAlpha = Math.pow(1 - k, 1.1) * .8;
          ctx.drawImage(CORES_FOGO[Math.min(4, Math.floor(k * 5))], q.x - rr, q.y - rr, rr * 2, rr * 2);

        } else if (q.t === "fumaca") {
          q.vx *= 1 - 1.2 * dt; q.vy *= 1 - 1.2 * dt;
          q.vy -= 30 * dt;
          q.x += q.vx * dt; q.y += q.vy * dt;
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    },

    vivo: function () { return this.calor > 0 || this.p.length > 0; }
  };

  /* =========================================================
     RAIOS — deslocamento do ponto médio, com galhos
     ========================================================= */
  var PRATA = "220,228,255", OURO = "255,214,140";

  var raios = {
    lista: [],
    proximoAmbiente: 0,
    ambiente: false,

    gerar: function (x1, y1, x2, y2, desloc, galhos) {
      var segs = [[x1, y1, x2, y2]], ramos = [], g, i, s, mx, my, dx, dy, len, nx, ny, off;
      for (g = 0; g < 6; g++) {
        var novo = [];
        for (i = 0; i < segs.length; i++) {
          s = segs[i];
          dx = s[2] - s[0]; dy = s[3] - s[1];
          len = Math.sqrt(dx * dx + dy * dy) || 1;
          nx = -dy / len; ny = dx / len;
          off = rand(-desloc, desloc);
          mx = (s[0] + s[2]) / 2 + nx * off;
          my = (s[1] + s[3]) / 2 + ny * off;
          novo.push([s[0], s[1], mx, my], [mx, my, s[2], s[3]]);

          if (galhos && g < 4 && Math.random() < .16) {
            var ang = Math.atan2(my - s[1], mx - s[0]) + rand(.35, .8) * (Math.random() < .5 ? -1 : 1);
            var l = len * rand(.7, 1.3);
            ramos.push(this.gerar(mx, my, mx + Math.cos(ang) * l, my + Math.sin(ang) * l, desloc * .5, false).segs);
          }
        }
        segs = novo;
        desloc *= .55;
      }
      return { segs: segs, ramos: ramos };
    },

    disparar: function (x1, y1, x2, y2, opts) {
      opts = opts || {};
      var dist = Math.hypot(x2 - x1, y2 - y1);
      var r = this.gerar(x1, y1, x2, y2, opts.desloc || dist * .18, opts.galhos !== false);
      r.vida = 0;
      r.max = opts.dur || .42;
      r.forca = opts.forca || 1;
      r.cor = opts.cor || PRATA;
      this.lista.push(r);
    },

    /* um raio do alto até o ponto (x, y) */
    doCeu: function (x, y, opts) {
      this.disparar(x + rand(-cena.W * .3, cena.W * .3), -20, x + rand(-10, 10), y, opts);
    },

    tracar: function (ctx, segs, largura, cor, alfa) {
      ctx.strokeStyle = "rgba(" + cor + "," + alfa + ")";
      ctx.lineWidth = largura;
      ctx.beginPath();
      for (var i = 0; i < segs.length; i++) {
        ctx.moveTo(segs[i][0], segs[i][1]);
        ctx.lineTo(segs[i][2], segs[i][3]);
      }
      ctx.stroke();
    },

    passo: function (dt, t) {
      var ctx = ctxRaios, W = cena.W, H = cena.H, i, j, r, k, a, clarear = 0;

      /* raios ambientes depois da abertura: raros, de propósito */
      if (this.ambiente && cena.visivel && !reduced && t > this.proximoAmbiente) {
        this.proximoAmbiente = t + rand(4.5, 9);
        var x = rand(W * .05, W * .95);
        this.disparar(x, -20, x + rand(-W * .2, W * .2), H * rand(.25, .55), { forca: .55, dur: .32, cor: Math.random() < .5 ? PRATA : OURO });
      }

      ctx.clearRect(0, 0, W, H);
      if (!this.lista.length) return;

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (i = this.lista.length - 1; i >= 0; i--) {
        r = this.lista[i];
        r.vida += dt;
        if (r.vida >= r.max) { this.lista.splice(i, 1); continue; }
        k = r.vida / r.max;
        /* o raio pisca: some e volta duas ou três vezes antes de apagar */
        a = (1 - k) * (Math.random() < .28 ? .25 : 1) * r.forca;
        clarear = Math.max(clarear, a);

        this.tracar(ctx, r.segs, 12, r.cor, .1 * a);
        this.tracar(ctx, r.segs, 5, r.cor, .35 * a);
        this.tracar(ctx, r.segs, 1.8, "255,250,245", .95 * a);
        for (j = 0; j < r.ramos.length; j++) {
          this.tracar(ctx, r.ramos[j], 4, r.cor, .25 * a);
          this.tracar(ctx, r.ramos[j], 1, "255,245,240", .7 * a);
        }
      }
      /* o céu acende junto com o raio */
      if (clarear > 0) {
        ctx.fillStyle = "rgba(225,230,245," + (.06 * clarear) + ")";
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = "source-over";
    },

    vivo: function () { return this.ambiente || this.lista.length > 0; }
  };

  /* =========================================================
     VIDRO — a tela preta da abertura
     ========================================================= */
  var vidro = {
    ativo: false,
    trincas: [],
    cacos: null,
    tBoom: 0,

    ligar: function () { this.ativo = true; },
    desligar: function () {
      this.ativo = false;
      this.trincas = [];
      this.cacos = null;
      ctxVidro.clearRect(0, 0, cena.W, cena.H);
    },

    /* Trinca radial: raios tortos saindo do impacto e pedaços de anel
       ligando um ao outro — é o anel que faz ler "vidro", não só rachadura. */
    trinca: function (x, y, R, cor) {
      var n = Math.round(rand(11, 16)), raiosT = [], linhas = [], i, j;
      for (i = 0; i < n; i++) {
        var ang = i / n * Math.PI * 2 + rand(-.2, .2);
        var pts = [[x, y]], px = x, py = y, len = 0, alvo = R * rand(.45, 1.05), a = ang;
        while (len < alvo) {
          var passo = rand(12, 34);
          a += rand(-.25, .25);
          px += Math.cos(a) * passo; py += Math.sin(a) * passo;
          len += passo;
          pts.push([px, py, len]);
        }
        raiosT.push(pts);
        linhas.push(pts);
      }
      [.16, .34, .58].forEach(function (frac) {
        var dist = R * frac;
        for (j = 0; j < n; j++) {
          if (Math.random() < .3) continue;   // anel quebrado, nunca fechado
          var pa = pontoEm(raiosT[j], dist * rand(.9, 1.1));
          var pb = pontoEm(raiosT[(j + 1) % n], dist * rand(.9, 1.1));
          if (!pa || !pb) continue;
          var mx = (pa[0] + pb[0]) / 2 + rand(-6, 6), my = (pa[1] + pb[1]) / 2 + rand(-6, 6);
          linhas.push([pa, [mx, my], pb]);
        }
      });
      this.trincas.push({ x: x, y: y, linhas: linhas, nasc: performance.now(), cor: cor || "255,255,255" });

      function pontoEm(pts, d) {
        for (var k = 1; k < pts.length; k++) if (pts[k][2] >= d) return pts[k];
        return null;
      }
    },

    /* Os cacos: uma grade polar em volta da explosão. Os pontos são
       compartilhados entre vizinhos, então não sobra fresta entre um caco e
       outro antes de eles voarem. */
    estilhacar: function (cx, cy) {
      var W = cena.W, H = cena.H, diag = Math.hypot(W, H);
      var n = W < 700 ? 14 : 18, angs = [], i, j;
      for (i = 0; i < n; i++) angs.push(i / n * Math.PI * 2 + rand(-.3, .3) * (Math.PI * 2 / n));
      var esc = Math.max(.7, Math.min(W, H) / 800);
      var radios = [36, 100, 200, 340, 540, 800].map(function (r) { return r * esc; })
        .filter(function (r) { return r < diag * .9; });
      radios.push(diag * 1.15);

      var P = radios.map(function (r) {
        return angs.map(function (a) {
          var rr = r * rand(.88, 1.12), aa = a + rand(-.05, .05);
          return [cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr];
        });
      });

      var cacos = [];
      function caco(poli) {
        var sx = 0, sy = 0;
        poli.forEach(function (p) { sx += p[0]; sy += p[1]; });
        var gx = sx / poli.length, gy = sy / poli.length;
        var dx = gx - cx, dy = gy - cy, d = Math.hypot(dx, dy) || 1;
        var vel = rand(650, 1500) * (1.35 - Math.min(d / diag, 1) * .8);
        var tom = Math.round(rand(8, 24));
        cacos.push({
          x: gx, y: gy,
          poli: poli.map(function (p) { return [p[0] - gx, p[1] - gy]; }),
          vx: dx / d * vel, vy: dy / d * vel,
          vr: rand(-7, 7), vz: rand(.5, 1.9),
          cor: "rgb(" + tom + "," + Math.round(tom * .85) + "," + tom + ")",
          brilho: rand(.15, .45)
        });
      }
      for (i = 0; i < n; i++) caco([[cx, cy], P[0][i], P[0][(i + 1) % n]]);
      for (j = 0; j < P.length - 1; j++) {
        for (i = 0; i < n; i++) {
          var i2 = (i + 1) % n;
          caco([P[j][i], P[j][i2], P[j + 1][i2], P[j + 1][i]]);
        }
      }
      this.cacos = cacos;
      this.tBoom = performance.now();
    },

    passo: function () {
      if (!this.ativo) return;
      var ctx = ctxVidro, W = cena.W, H = cena.H, agora = performance.now(), i, j;
      ctx.clearRect(0, 0, W, H);

      if (!this.cacos) {
        var g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
        g.addColorStop(0, "#0e0b0e");
        g.addColorStop(1, "#040304");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (i = 0; i < this.trincas.length; i++) {
          var tr = this.trincas[i];
          var p = Math.min(1, (agora - tr.nasc) / 200);
          for (var pass = 0; pass < 2; pass++) {
            ctx.strokeStyle = pass ? "rgba(255,255,255,.62)" : "rgba(" + tr.cor + ",.16)";
            ctx.lineWidth = pass ? 1.1 : 4;
            ctx.beginPath();
            for (j = 0; j < tr.linhas.length; j++) {
              var l = tr.linhas[j], ate = Math.max(2, Math.ceil(l.length * p));
              ctx.moveTo(l[0][0], l[0][1]);
              for (var k = 1; k < ate && k < l.length; k++) ctx.lineTo(l[k][0], l[k][1]);
            }
            ctx.stroke();
          }
          /* clarão do ponto de impacto, que apaga em meio segundo */
          var f = 1 - Math.min(1, (agora - tr.nasc) / 520);
          if (f > 0) {
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = f;
            var rf = 70 + 90 * (1 - f);
            ctx.drawImage(CORES_FOGO[0], tr.x - rf, tr.y - rf, rf * 2, rf * 2);
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = "source-over";
          }
        }
        return;
      }

      /* explosão: os cacos voam na direção de quem assiste */
      var a = (agora - this.tBoom) / 1000;
      if (a > 1.15) { this.desligar(); return; }
      var alfa = Math.max(0, 1 - a / 1.05);
      for (i = 0; i < this.cacos.length; i++) {
        var c = this.cacos[i];
        var s = 1 + c.vz * a;
        ctx.save();
        ctx.translate(c.x + c.vx * a, c.y + c.vy * a + 260 * a * a);
        ctx.rotate(c.vr * a);
        ctx.scale(s, s);
        ctx.globalAlpha = alfa;
        ctx.beginPath();
        ctx.moveTo(c.poli[0][0], c.poli[0][1]);
        for (j = 1; j < c.poli.length; j++) ctx.lineTo(c.poli[j][0], c.poli[j][1]);
        ctx.closePath();
        ctx.fillStyle = c.cor;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,240,230," + c.brilho + ")";
        ctx.lineWidth = 1.2 / s;
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  /* =========================================================
     BRASAS PELA PÁGINA

     Canvas fixo (#brasas) cobrindo a janela. Poucas brasas de cada vez —
     ~26 no desktop, ~12 no celular — subindo devagar, com um balanço
     lateral e piscando de leve. Loop próprio: roda em qualquer ponto da
     rolagem e dorme quando a aba fica escondida.
     ========================================================= */
  (function brasasPelaPagina() {
    var cv = document.getElementById("brasas");
    if (!cv || reduced) return;
    var ctx = cv.getContext("2d");
    var W = 0, H = 0, alvo = 0, lista = [], ultimoB = 0, ativo = false;

    function medirB() {
      W = window.innerWidth; H = window.innerHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      alvo = W < 700 ? 12 : 26;
    }

    /* espalhadas pela tela na primeira leva; depois nascem no pé */
    function nova(espalhada) {
      return {
        x: Math.random() * W,
        y: espalhada ? Math.random() * H : H + 12,
        vx: rand(-5, 5), vy: -rand(16, 44),
        r: rand(.9, 2.2), vida: 0, max: rand(7, 14), fase: Math.random() * 6.28
      };
    }

    function passoB(ts) {
      var dt = Math.min((ts - ultimoB) / 1000, .05), t = ts / 1000;
      ultimoB = ts;
      while (lista.length < alvo) lista.push(nova(false));
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (var i = lista.length - 1; i >= 0; i--) {
        var q = lista[i];
        q.vida += dt;
        q.x += (q.vx + Math.sin(t * 1.3 + q.fase) * 14) * dt;
        q.y += q.vy * dt;
        if (q.vida >= q.max || q.y < -20) { lista.splice(i, 1); continue; }
        var k = q.vida / q.max;
        ctx.globalAlpha = Math.max(0, Math.sin(k * Math.PI) * (.45 + .3 * Math.sin(t * 7 + q.fase * 3)));
        var rb = q.r * 5;
        ctx.drawImage(SPRITE_BRASA, q.x - rb, q.y - rb, rb * 2, rb * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (!document.hidden) requestAnimationFrame(passoB); else ativo = false;
    }

    function ligarB() {
      if (ativo) return;
      ativo = true;
      ultimoB = performance.now();
      requestAnimationFrame(passoB);
    }

    medirB();
    for (var i = 0; i < alvo; i++) lista.push(nova(true));
    ligarB();
    window.addEventListener("resize", medirB);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) ligarB(); });
  })();

  /* =========================================================
     LOOP ÚNICO
     ========================================================= */
  var rodando = false, ultimo = 0;

  function precisaRodar() {
    if (vidro.ativo) return true;
    if (reduced || document.hidden || !cena.visivel) return false;
    return fogo.vivo() || raios.vivo();
  }

  function quadro(ts) {
    var dt = Math.min((ts - ultimo) / 1000, .05);
    ultimo = ts;
    var t = ts / 1000;
    fogo.passo(dt, t);
    raios.passo(dt, t);
    vidro.passo();
    if (precisaRodar()) requestAnimationFrame(quadro);
    else rodando = false;
  }

  function acordar() {
    if (rodando) return;
    rodando = true;
    ultimo = performance.now();
    requestAnimationFrame(quadro);
  }

  medir();

  var redimensionar;
  window.addEventListener("resize", function () {
    clearTimeout(redimensionar);
    redimensionar = setTimeout(function () { medir(); acordar(); }, 150);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      cena.visivel = e[0].isIntersecting;
      if (cena.visivel) acordar();
    }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) acordar(); });

  /* ---------- efeitos de impacto ---------- */
  function piscar(p, forca, dur) {
    if (!clarao || !clarao.animate) return;
    clarao.style.setProperty("--cx", (p.x / cena.W * 100) + "%");
    clarao.style.setProperty("--cy", (p.y / cena.H * 100) + "%");
    clarao.animate([{ opacity: forca }, { opacity: 0 }], { duration: dur, easing: "cubic-bezier(.2,.6,.3,1)" });
  }

  function tremer(nivel) {
    hero.classList.remove("treme-1", "treme-2");
    void hero.offsetWidth;   // reinicia a animação se ela já estiver no meio
    hero.classList.add("treme-" + nivel);
  }

  /* =========================================================
     A ABERTURA

     Linha do tempo: ver o comentário logo acima de abertura().
     ========================================================= */
  var bfBlack  = document.getElementById("bfBlack");
  var bfFriday = document.getElementById("bfFriday");
  /* o centro do SÍMBOLO da Unicive, não do bloco da marca (que inclui a assinatura) */
  var bfMarca  = document.querySelector(".bf__leao") || document.getElementById("bfMarca");
  var relogios = [];
  var FASES = ["fase-black", "fase-friday", "fase-simbolo"];

  function depois(ms, fn) { relogios.push(setTimeout(fn, ms)); }

  function acenderCena() {
    fogo.calor = CONFIG.fogoAmbiente ? 1 : 0;
    raios.ambiente = CONFIG.raiosAmbiente;
    raios.proximoAmbiente = performance.now() / 1000 + 3;
    acordar();
  }

  /* =========================================================
     CAPELOS VOANDO
     Capelos lançados do pé da tela, sobem girando e caem — no fim da
     abertura e quando alguém entra na lista VIP. Web Animations API:
     três quadros com easing por trecho (sobe freando, cai acelerando).
     ========================================================= */
  var CAPELO_SVG = '<svg viewBox="0 0 100 74"><path d="M50 4 98 26 50 48 2 26z" fill="#0b2a20" stroke="#ffc572" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 36v18c0 7 12 13 26 13s26-6 26-13V36L50 48z" fill="#06231a" stroke="#ffc572" stroke-width="2.5"/>' +
    '<path d="M50 26 82 34v22" fill="none" stroke="#e3a11b" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M78 56h8l-2 13h-4z" fill="#e3a11b"/><circle cx="50" cy="26" r="3.5" fill="#ffc572"/></svg>';

  function lancarCapelos(qtd) {
    var area = document.getElementById("capelos");
    if (!area || reduced || !area.animate) return;
    var W = window.innerWidth, H = window.innerHeight;
    qtd = qtd || (W < 700 ? 9 : 16);
    for (var i = 0; i < qtd; i++) {
      (function (k) {
        var el = document.createElement("div");
        el.className = "capelo";
        el.style.setProperty("--t", Math.round(rand(46, W < 700 ? 64 : 84)) + "px");
        el.innerHTML = CAPELO_SVG;
        area.appendChild(el);
        var x0 = rand(W * .1, W * .9), x1 = x0 + rand(-W * .18, W * .18), x2 = x1 + rand(-W * .1, W * .1);
        var topo = rand(H * .06, H * .4), giro = rand(-540, 540), dur = rand(2400, 3400);
        var a = el.animate([
          { transform: "translate(" + x0 + "px," + (H + 80) + "px) rotate(0deg)", easing: "cubic-bezier(.2,.7,.4,1)" },
          { transform: "translate(" + x1 + "px," + topo + "px) rotate(" + giro * .5 + "deg)", offset: .45, easing: "cubic-bezier(.5,0,.8,.4)" },
          { transform: "translate(" + x2 + "px," + (H + 120) + "px) rotate(" + giro + "deg)" }
        ], { duration: dur, delay: k * 70, fill: "both" });
        a.onfinish = function () { el.remove(); };
      })(i);
    }
  }
  var capelosNaAbertura = false;

  function finalizar() {
    relogios.forEach(clearTimeout);
    relogios = [];
    FASES.forEach(function (f) { raiz.classList.remove(f); });
    raiz.classList.remove("is-abertura", "is-rodando");
    raiz.classList.add("is-pulado", "is-revelado");
    vidro.desligar();
    acenderCena();
    if (!capelosNaAbertura) { capelosNaAbertura = true; setTimeout(function () { lancarCapelos(); }, 500); }
  }

  /* A abertura da Unicive:
       150  BLACK: as letras caem uma a uma
       600  FRIDAY: as letras sobem com o risco dourado
      1000  as três peças do símbolo chegam de fora e se encaixam (brilho no encaixe)
      1500  o resto do hero entra em cascata */
  function abertura() {
    raiz.classList.add("is-rodando");
    try { sessionStorage.setItem("bf-unicive-venda-abertura", "1"); } catch (e) {}
    acordar();

    depois(150,  function () { raiz.classList.add("fase-black"); });
    depois(600,  function () { raiz.classList.add("fase-friday"); });
    depois(1000, function () { raiz.classList.add("fase-simbolo"); acenderCena(); });
    depois(1500, function () { raiz.classList.add("is-revelado"); });
    depois(2300, function () { capelosNaAbertura = true; lancarCapelos(); });
    depois(4200, finalizar);
  }

  var botaoPular = document.getElementById("pular");
  if (botaoPular) botaoPular.addEventListener("click", function () {
    track("abertura_pulada");
    finalizar();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && raiz.classList.contains("is-abertura")) finalizar();
  });

  if (raiz.classList.contains("is-abertura")) {
    /* As fontes mudam a medida das palavras: medir o centro do BLACK antes
       do Anton carregar poria a trinca no lugar errado. */
    var fontes = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontes, new Promise(function (r) { setTimeout(r, 1200); })]).then(function () {
      medir();
      abertura();
    });
  } else {
    raiz.classList.add("is-revelado");
    acenderCena();

  }

  /* =========================================================
     DOCK (mobile) — aparece depois que o hero sai da tela
     ========================================================= */
  (function dock() {
    var el = document.getElementById("dock");
    if (!el || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (e) {
      el.classList.toggle("is-on", !e[0].isIntersecting);
    }, { threshold: .05 }).observe(hero);
  })();

  /* =========================================================
     IR PARA O FORMULÁRIO
     O formulário mora no hero. Os CTAs de baixo (pavio, dock) rolam até
     ele e já deixam o cursor no primeiro campo.
     ========================================================= */
  var form = document.getElementById("bf-unicive-form");
  var nomeInput = document.getElementById("nome");
  var telefoneInput = document.getElementById("telefone");
  var emailInput = document.getElementById("email");
  var cartao = document.getElementById("inscricao");

  $$("[data-ir-form]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      track("cta_click", { cta: b.getAttribute("data-cta") || "", cta_text: (b.textContent || "").trim() });
      if (!cartao) return;
      cartao.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      /* preventScroll: o foco não pode brigar com a rolagem suave */
      setTimeout(function () { if (nomeInput) nomeInput.focus({ preventScroll: true }); }, reduced ? 0 : 650);
    });
  });
  $$("[data-youtube-live], [data-youtube-canal]").forEach(function (a) {
    a.addEventListener("click", function () { track("youtube_click", { cta: a.getAttribute("data-cta") || "" }); });
  });

  /* =========================================================
     VALIDAÇÃO
     ========================================================= */
  function setError(id, msg) {
    var campo = document.getElementById(id);
    var errorEl = document.querySelector('[data-error-for="' + id + '"]');
    if (campo) campo.classList.add("is-invalid");
    if (errorEl) errorEl.textContent = msg;
  }

  function clearError(id) {
    var campo = document.getElementById(id);
    var errorEl = document.querySelector('[data-error-for="' + id + '"]');
    if (campo) campo.classList.remove("is-invalid");
    if (errorEl) errorEl.textContent = "";
  }

  function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  /* §7.7 — conta DÍGITOS, não caracteres, e remove o "+55" da máscara pelo
     "+" literal. Remover pelos dígitos seria ambíguo: o DDD 55 existe. */
  function isPhone(v) {
    var d = v.trim().replace(/^\+\s*55\s*/, "").replace(/\D/g, "");
    if (PHONE_MODE === "celular_ou_fixo_br") return d.length === 10 || d.length === 11;
    if (PHONE_MODE === "internacional")      return d.length >= 8 && d.length <= 15;
    return d.length === 11 && d[2] === "9";
  }

  /* E.164 brasileiro: sem o +55, "81999967415" vira Japão no match. */
  function toE164(v) {
    var d = String(v || "").trim().replace(/^\+\s*55\s*/, "").replace(/\D/g, "");
    if (d.length > 11 && d.indexOf("55") === 0) d = d.slice(2);
    return d ? "+55" + d : "";
  }

  function validate() {
    var ok = true;
    var nome  = nomeInput     ? nomeInput.value.trim()     : "";
    var tel   = telefoneInput ? telefoneInput.value.trim() : "";
    var email = emailInput    ? emailInput.value.trim()    : "";

    ["nome", "telefone", "email"].forEach(clearError);

    if (nome.length < 2) { setError("nome", "Informe seu nome."); ok = false; }
    if (!isPhone(tel))   { setError("telefone", "Informe seu WhatsApp com DDD."); ok = false; }
    if (!isEmail(email)) { setError("email", "Informe um e-mail válido."); ok = false; }

    return ok;
  }

  /* =========================================================
     EMISSOR ÚNICO DE LEAD (§9)
     ========================================================= */
  function waitForPixel(timeoutMs) {
    timeoutMs = timeoutMs || PIXEL_TIMEOUT_MS;
    return new Promise(function (resolve) {
      function pronto() {
        return window.pixel_x_app && typeof window.pixel_x_app.send_event === "function";
      }
      if (pronto()) return resolve(true);

      var inicio = Date.now();
      var t = setInterval(function () {
        if (pronto()) {
          clearInterval(t);
          resolve(true);
        } else if (Date.now() - inicio > timeoutMs) {
          clearInterval(t);
          console.warn("[tracking] pixel_x_app não ficou pronto a tempo; Lead não enviado.");
          resolve(false);
        }
      }, 100);
    });
  }

  var leadEnviado = false;

  function trackLead(dados) {
    if (LEAD_MODE !== "site") return Promise.resolve(false);

    if (leadEnviado) {
      console.warn("[tracking] Lead já enviado nesta página; ignorando.");
      return Promise.resolve(false);
    }
    leadEnviado = true;

    return waitForPixel().then(function (ok) {
      if (!ok) return false;

      return Promise.resolve(
        window.pixel_x_app.send_event({
          event_name: "Lead",
          lead_name:  dados.nome || "",
          lead_email: (dados.email || "").trim().toLowerCase(),
          lead_phone: toE164(dados.telefone)
        })
      ).then(function () {
        console.log("[tracking] Lead enviado.");
        return true;
      });
    }).catch(function (err) {
      console.error("[tracking] send_event falhou:", err);
      leadEnviado = false;
      return false;
    });
  }

  window.trackLead = trackLead;

  /* =========================================================
     ENVIO
     ========================================================= */
  function enviarInscricao() {
    var btn = form.querySelector("button[type='submit']");
    var rotulo = btn ? btn.querySelector("span") : null;
    var textoOriginal = rotulo ? rotulo.textContent : "";

    if (btn) {
      btn.disabled = true;
      if (rotulo) rotulo.textContent = "Enviando...";
    }

    var destino = CONFIG.grupoWhatsApp || CONFIG.youtubeCanal;
    if (!CONFIG.grupoWhatsApp) {
      console.warn("[Form] CONFIG.grupoWhatsApp vazio: redirecionando para o canal do YouTube.");
    }

    var payload = {
      nome: nomeInput.value.trim(),
      email: emailInput.value.trim(),
      telefone: telefoneInput.value.trim(),
      pagina_url: window.location.href,
      utm_source: utm("utm_source"),
      utm_medium: utm("utm_medium"),
      utm_campaign: utm("utm_campaign"),
      utm_content: utm("utm_content"),
      live: CONFIG.produto
    };

    /* 1. Lead ANTES de qualquer coisa que possa tirar o visitante da página (§7.6). */
    trackLead({ nome: payload.nome, email: payload.email, telefone: payload.telefone })

      /* 2. Planilha. no-cors esconde a resposta — é esperado (ver livepmpe). */
      .then(function () {
        return fetch(SHEET_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      })

      /* 3. Confirma e leva para o grupo. §7.6 — nada de form.reset(). */
      .then(function () {
        track("inscricao_black_friday", { produto: CONFIG.produto });

        var successEl = document.getElementById("form-success");
        if (successEl) {
          if (!CONFIG.grupoWhatsApp) {
            var linha = successEl.querySelector("span");
            if (linha) linha.textContent = "Levando você para o canal da CPPEM no YouTube…";
          }
          successEl.hidden = false;
          lancarCapelos(12);
          successEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        setTimeout(function () { window.location.href = destino; }, REDIRECT_DELAY_MS);
      })

      .catch(function (err) {
        console.error("[Form] Erro ao enviar:", err);
        setError("email", "Erro ao enviar. Tente novamente.");
        if (btn) {
          btn.disabled = false;
          if (rotulo) rotulo.textContent = textoOriginal;
        }
      });
  }

  /* =========================================================
     BARREIRA ÚNICA DE SUBMIT (§7.8) — captura no DOCUMENT
     · inválido            → morre aqui, a PixelX não vê nada
     · válido, modo "site" → morre aqui também; quem dispara o Lead somos nós
     · válido, modo painel → propaga, e só a regra do painel dispara
     ========================================================= */
  document.addEventListener("submit", function (e) {
    if (!form || e.target !== form) return;

    e.preventDefault();

    if (!validate()) {
      e.stopImmediatePropagation();
      return;
    }

    if (LEAD_MODE === "site") e.stopImmediatePropagation();

    enviarInscricao();
  }, true);

  [["nome", nomeInput], ["telefone", telefoneInput], ["email", emailInput]].forEach(function (par) {
    if (par[1]) par[1].addEventListener("input", function () { clearError(par[0]); });
  });

})();

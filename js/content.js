(function (app) {
  'use strict';

  /* ===== Edit everything here. Items marked todo:true show a dashed red underline until you fill them in. ===== */
  const SITE = {
    intro: `I'm <span class="chip">Garang Kiariga</span>, a sophomore at Emory studying computer science and neuroscience. Most of my time goes into research labs, where I write data pipelines, and into side projects in networking and games. My <a class="chip" href="#experience">experience</a> and <a class="chip" href="#projects">projects</a> are in the tiles below. Want to talk? <a class="chip" href="#contact">Reach out</a>.`,
    links: [
      { label: 'GitHub', href: 'https://github.com/bizzarethought' },
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/garang-kiariga-252808147/' },
    ],
    me: 'original',
    /* robots that wander in the meadow. Any look with an img/sheet-<look>.webp works (18 frames in the same order) */
    meadowBots: ['crimson', 'cobalt', 'teal'],
    tiles: [
      /* each tile takes the colour of the robot standing on it; t is the text colour on that fill */
      {
        id: 'experience',
        n: 1,
        sym: 'Ex',
        name: 'experience',
        bot: 'cobalt',
        color: 'var(--tile-experience)',
        t: 'var(--tile-light-ink)',
      },
      {
        id: 'projects',
        n: 2,
        sym: 'Pj',
        name: 'projects',
        bot: 'crimson',
        color: 'var(--tile-projects)',
        t: 'var(--tile-light-ink)',
      },
      {
        id: 'about',
        n: 3,
        sym: 'Ab',
        name: 'about',
        bot: 'sunflower',
        color: 'var(--tile-about)',
        t: 'var(--tile-ink)',
      },
      {
        id: 'contact',
        n: 4,
        sym: 'Hi',
        name: 'reach out',
        bot: 'snow',
        color: 'var(--tile-contact)',
        t: 'var(--tile-ink)',
      },
    ],
    projects: [
      {
        title: 'Intrusion',
        github: 'https://github.com/bizzarethought/Intrusion',
        demo: 'intrusion',
        year: '2026',
        where: 'Emory Hacks',
        img: 'intrusion',
        bot: 'crimson',
        text: 'A party game for 3 to 10 people where one player is secretly an AI. You play mini-games, chat, and vote out whoever you think it is. The AI plays too, and argues its case in the chat. Built at Emory Hacks.',
        tags: ['React', 'TypeScript', 'PixiJS', 'Colyseus', 'Node', 'AWS', 'Blender'],
        go: [{ label: 'Play Intrusion', href: 'https://play-intrusion.us/' }],
      },
      {
        title: 'TimeMachine',
        github: '', // Add this project's repository URL when ready.
        year: 'In progress',
        where: 'Debugging proxy',
        text: "Records an app's API traffic on your machine so you can replay a failed session exactly as it happened. I'm adding options to replay it with extra latency, dropped requests or server errors.",
        tags: ['Go', 'HTTP', 'WebSockets', 'SQLite', 'Docker'],
      },
      {
        title: 'Drift',
        github: '', // Add this project's repository URL when ready.
        year: '2026',
        where: 'Offline collaborative editor',
        text: 'A shared text editor that works offline. Edits made without a connection merge cleanly when you reconnect. In testing with 50 clients sending delayed, duplicated and out-of-order updates, it caught up in under 200 ms.',
        tags: ['React', 'CRDTs', 'IndexedDB', 'WebSockets'],
      },
      {
        title: 'Relayless',
        github: '', // Add this project's repository URL when ready.
        year: '2026',
        where: 'Peer-to-peer file transfer',
        text: 'Sends files, text and links directly between two browsers over an encrypted WebRTC connection. Files go in 1 MB chunks, so a dropped connection picks up where it stopped. A 100 MB file takes 1.8 seconds on a local network.',
        tags: ['TypeScript', 'WebRTC', 'Web Crypto API'],
      },
      {
        title: 'Source checker',
        github: '', // Add this project's repository URL when ready.
        year: '2026',
        where: 'Guldi Lab, Emory',
        text: "A Chrome extension I made for the lab. Select text in a paper and it shows a short summary with a link to the source. Checking one paper's sources went from about 45 minutes to about 10.",
        tags: ['Chrome extension', 'Manifest V3', 'JavaScript'],
      },
    ],
    roles: [
      {
        title: 'Undergraduate Research Assistant',
        org: 'Computational Mechanisms of Psychopathology Lab, Emory',
        when: 'Aug 2026 to now',
        text: 'I write the Bash and R scripts that preprocess fMRI and behavioral data from more than 300 clinical participants, plus quality checks that flag bad scans before they reach the models. I also train new research assistants.',
      },
      {
        title: 'TechLab Student Assistant Senior',
        org: 'Office of Information Technology, Emory',
        when: 'Aug 2026 to now',
        text: "TechLab is Emory's maker space. About 50 people a week come in with a Raspberry Pi or a 3D print that isn't working, and I help them fix it.",
      },
      {
        title: 'Computational Neuroscience Research Assistant',
        org: 'Department of Engineering, University College London',
        when: 'May to Aug 2026',
        text: 'I replaced more than ten preprocessing notebooks with one version-controlled FastAPI service, which the lab now uses as its standard pipeline. Its validation cut data-cleaning errors by 85%. I also ran NLP feature extraction on 10,000 text samples.',
      },
      {
        title: 'Bioinformatics Summer Researcher',
        org: 'RNA Institute, University at Albany (remote)',
        when: 'Jun to Aug 2026',
        text: 'I ran RNA-seq analysis for my own project on shared HPC clusters using R and the command line, then presented the results to the institute.',
      },
      {
        title: 'Machine Learning Research Assistant',
        org: 'Guldi Lab, Emory',
        when: 'Dec 2025 to Apr 2026',
        text: "I built the source checker (it's under Projects) and wrote Bash and R scripts that turn historical and climate-policy documents into datasets for text classifiers.",
      },
    ],
    /* the big line at the top of the About page */
    aboutLine: `From Kenya, studying at Emory until 2029.`,
    about: `I'm doing a double major in computer science and neuroscience. Before Emory I did a data science certificate at Strathmore University in Nairobi, and last summer I worked in an engineering lab at UCL in London. Outside class I work at Emory's TechLab and build side projects, mostly networking tools.`,
    facts: [
      {
        s: 'Em',
        b: 'Emory University',
        t: 'BS Computer Science and BS Neuroscience and Behavioral Biology. GPA 3.92. Graduating May 2029.',
      },
      {
        s: 'Sm',
        b: 'Strathmore University',
        t: 'Professional Certificate in Data Science. Nairobi, January to July 2024.',
      },
      {
        s: 'Cw',
        b: 'Coursework',
        t: 'Data structures and algorithms, computer architecture, data warehousing, text mining.',
      },
      {
        s: 'Tl',
        b: 'Tools',
        t: 'Python, Bash, R, Go, TypeScript, C, SQL. HPC clusters, Docker, Linux, Blender.',
      },
      { s: 'Sw', b: 'Languages', t: 'English and Swahili.' },
    ],
    contact: [
      { s: 'Em', label: 'Email', value: 'gkiarig@emory.edu', copy: true },
      {
        s: 'Gh',
        label: 'GitHub',
        value: 'github.com/bizzarethought',
        href: 'https://github.com/bizzarethought',
      },
      {
        s: 'Li',
        label: 'LinkedIn',
        value: 'linkedin.com/in/garang-kiariga-252808147',
        href: 'https://www.linkedin.com/in/garang-kiariga-252808147/',
      },
    ],
  };
  /* ===== End of things to edit ===== */

  app.SITE = SITE;
})((window.Garang = window.Garang || {}));

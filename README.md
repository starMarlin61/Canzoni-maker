# Cantico - Leggio Liturgico per iPad e Mac

Un'applicazione web **offline-first** progettata per pianisti e organisti liturgici. Permette di organizzare i canti per momenti della messa, visualizzare testo e accordi con allineamento perfetto, trasporre le tonalità in tempo reale, scorrere automaticamente il testo e gestire immagini di spartiti cartacei.

## Caratteristiche Principali

*   **Organizzazione Liturgica:** Canti divisi per momenti della messa con colorazioni intuitive.
*   **Visualizzazione Leggio:** Ottimizzato per iPad (sia orizzontale che verticale) con scorrimento automatico, regolazione del font e modalità scura nativa.
*   **Trasposizione Istantanea:** Traspone gli accordi al volo di semitono in semitono (notazione latina *Do, Re, Mi...*).
*   **Editor ChordPro Integrato:** Inserimento facilitato con tastiera virtuale degli accordi e anteprima in tempo reale.
*   **Doppia Modalità:** Passa istantaneamente dal testo/accordi alla foto dello spartito originale.
*   **IndexedDB Offline:** Tutti i brani e gli spartiti caricati sono salvati in locale sul browser dell'iPad/Mac, senza bisogno di connessione internet in chiesa.
*   **Backup Facile:** Esporta o importa l'intera raccolta in un archivio ZIP (contenente il database dei canti e la cartella con le immagini reali degli spartiti).

---

## Come Avviare l'Applicazione

L'applicazione utilizza i moduli Javascript ES6 nativi del browser. Per motivi di sicurezza (CORS), i browser moderni impediscono il caricamento dei moduli se il file HTML viene aperto direttamente con un doppio click (protocollo `file://`). Deve essere servito tramite un server locale.

### Requisiti
*   **Node.js** installato sul Mac.

### Istruzioni di avvio

1.  Apri il **Terminale** sul tuo Mac.
2.  Naviga nella cartella del progetto:
    ```bash
    cd /Users/username/CANZONI
    ```
3.  Avvia il server locale con il comando:
    ```bash
    npm start
    ```
    *Questo comando avvierà un server web locale sulla porta `8080` disattivando la cache per riflettere subito le modifiche.*

4.  Sul tuo Mac, apri Safari o Chrome e vai su:
    [http://localhost:8080](http://localhost:8080)

---

## Come Connettere l'iPad (Uso a Messa)

Per usare l'app come leggio sul tuo iPad mentre suoni:

1.  Assicurati che sia il **Mac** che l'**iPad** siano connessi alla **stessa rete Wi-Fi** (es. il Wi-Fi di casa o l'hotspot del tuo telefono).
2.  Trova l'**indirizzo IP locale** del tuo Mac. Puoi vederlo nelle Impostazioni di Sistema del Mac -> Rete -> Wi-Fi (es. `192.168.1.50`). Il server avviato nel terminale solitamente ti mostrerà anche gli indirizzi IP locali disponibili.
3.  Sull'iPad, apri Safari e digita l'indirizzo IP del Mac seguito da `:8080`.
    *Esempio:* `http://192.168.1.50:8080`
4.  **Consiglio:** Clicca sul tasto di condivisione di Safari sull'iPad e seleziona **"Aggiungi alla schermata Home"**. L'app si comporterà come un'applicazione nativa a schermo intero senza le barre di Safari!
5.  Una volta aperta sull'iPad, l'app salverà tutti i canti in locale. Potrai usarla offline!

---

## Formato ChordPro (Guida Rapida)

L'editor utilizza la sintassi ChordPro per allineare gli accordi sopra le parole. 
Scrivi l'accordo tra parentesi quadre `[...]` prima della sillaba su cui deve suonare.

**Esempio:**
```text
[Do]Al[Sol]leluia, [Fa]lode a [Do]Te!
```
Verrà renderizzato come:
```text
Do   Sol      Fa     Do
Al - leluia,  lode a Te!
```

### Direttive speciali supportate:
*   `{comment: Strofa 1}` (oppure `{c: Strofa 1}`): Mostra una riga di commento in corsivo.
*   `{chorus}`: Inizia la sezione del Ritornello (mostra una barra colorata verticale a sinistra).
*   `{eoc}`: Fine del Ritornello.

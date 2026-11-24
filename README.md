# Leitwerk · Planungszentrale für Studiengangsleitungen

Statischer Bootstrap-Demonstrator für das DHBW-Integrationsseminar Wirtschaftsinformatik. Startwoche ist der 23.–27. November 2026. Alle Termin- und Personendaten sind fiktiv.

## Auf GitHub Pages veröffentlichen

1. ZIP entpacken und die enthaltenen Dateien und Ordner in das Hauptverzeichnis des Repositories hochladen. Dort liegen unter anderem index.html, model.worker.js und assets/.
2. In Settings → Pages den Branch mit den Dateien und den Ordner /(root) als Veröffentlichungsquelle auswählen.
3. Nach dem Deployment die Pages-Adresse aufrufen. Alternativ lokal im Projektordner mit `python -m http.server 8000` starten und http://localhost:8000 öffnen. Der Modell-Worker benötigt einen HTTP(S)-Ursprung.

## Sprachmodell starten

Im SGL-Copilot **Sprachmodell · Qwen 2.5** auswählen und auf **Sprachmodell laden** klicken. Das Modell Qwen2.5-0.5B-Instruct in INT8 läuft über Transformers.js und ONNX Runtime Web in einem separaten Browser-Worker auf der CPU. Der erste Start lädt rund 520 MB von Hugging Face. Je nach Browser werden die Dateien für spätere Starts zwischengespeichert. Der Browser benötigt WebAssembly SIMD und ausreichend freien Arbeitsspeicher. Ein aktueller Desktop-Browser empfiehlt sich für den Pitch. Den ersten Download vor der Präsentation durchführen. Die Dauer der Inferenz hängt von der CPU ab. Modell beenden stoppt den Worker und gibt seinen Arbeitsspeicher frei.

### Demonstration

1. Unter **Handlungsbedarf** den Konflikt in A 201 öffnen. „Finanzierung“ und „Bilanzierung“ überlappen sich am Dienstag von 10 bis 11 Uhr. Der Planer kann für „Finanzierung“ einen anderen Raum zur gleichen Zeit finden. Jede Übernahme wird protokolliert.
2. Für eine freie Modellanfrage den Termin **Finanzierung** öffnen und **Mit KI umplanen** wählen. Als Wunsch **Am Donnerstag nachmittags bitte.** eingeben. Das Modell interpretiert den Wunsch. Der Planer sucht mit der erkannten Vorgabe im 15-Minuten-Raster nach einem freien Zeitfenster und erhält Kurs, Lehrperson und Dauer. Die Oberfläche zeigt Interpretation, bisherigen Stand und Vorschlag vor der Freigabe.
3. Im Modus **Frage beantworten** beispielsweise fragen: „Nenne eine Prüfung in dieser Woche und ihren Raum.“ Das Sprachmodell übersetzt die freie Frage in einen Abfrageauftrag. Der gewählte Kalenderdienst berechnet die Antwort aus den Terminen und Konflikten der aktuellen Auswahl. Unter „Verwendete Plandaten“ lassen sich die Einträge öffnen. Ein kleines Modell kann Absichten falsch zuordnen. Prüfe bei einer Umplanung die angezeigte Interpretation vor der Freigabe.
4. Unter **Änderungsverlauf** die letzte Änderung bei Bedarf zurücknehmen.

## Weitere Funktionen

- Wochenraster und mobile Terminliste, Kursfilter und Wochennavigation.
- Termine anlegen, bearbeiten und mit Bestätigung entfernen.
- Raum-, Lehrpersonen- und Kurskonflikte erkennen und Alternativen berechnen.
- Ressourcenbelegung für alle Kurse der gewählten Woche anzeigen. Eine Doppelbelegung zählt bei den belegten Stunden einmal.
- Gefilterten Wochenplan als iCalendar-Datei exportieren. Die Uhrzeiten werden als lokale Zeiten ausgegeben.
- Änderungen im Browser speichern. Vorhandene Daten der ersten Leitwerk-Version werden beim erstmaligen Öffnen auf derselben Domain übernommen.
- **Planauskunft** ohne Modelldownload für fünf feste Abfragearten. Ein lokaler Textklassifikator ordnet die Frage zu. Exakte Ergebnisse werden aus dem Plan berechnet.

## Aufbau und Daten

Die Seite läuft ohne Backend und API-Schlüssel. Bootstrap, Inter, Lucide, Bild und Modelllaufzeit sind lokal enthalten. Nur der erstmalige Bezug der Modellgewichte und Tokenizer benötigt externe Anfragen. Eingaben zur Planung werden im Browser verarbeitet. Änderungen gelten im jeweiligen Browserprofil. Eine gemeinsame Hochschuldatenbank, Raumkapazitäten, Laboranforderungen und individuelle Dienstzeiten sind außerhalb des Demo-Modells.

- engine.js · Seed-Daten, Konflikte und klassische Optimierung
- app.js · Kalender, Formulare und Planauskunft
- desk.js · Ressourcen, Änderungsverlauf, Export und KI-Bedienung
- model-prompts.js · Aufbereitung der Modellanfragen, Interpretation und Prüfung der Zeitfenster
- model.worker.js · lokale Inferenz
- assets/runtime/ · mitgelieferte Laufzeit und Lizenzen

Eigenständiger Seminarentwurf. Architekturaufnahme über Unsplash (Bildkennung photo-1486406146926-c627a92ad1ab). Keine Zugehörigkeit zur Deutschen Bank.

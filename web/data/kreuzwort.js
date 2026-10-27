// Kreuzwort – deutsche Kreuzworträtsel-Hinweise (selbst verfasst). Wörter in Großschreibung, Umlaute als Ä/Ö/Ü, kein ß, Längen 3–8.
// CLUES = { "WORT": ["Hinweis 1", "Hinweis 2", …] }. Intern kompakt als Zeilen „WORT: Hinweis | Hinweis“ gepflegt.
const RAW = `
AAL: Schlangenförmiger Fisch | Glatter Speisefisch
AAS: Tierkadaver | Verwesendes Fleisch
ABC: Alphabet | Buchstabenreihe
ABO: Dauerbezug (Kurzwort) | Zeitungsbestellung
ABT: Klostervorsteher | Oberhaupt eines Klosters
ADE: Lebe wohl | Abschiedsgruß
AHN: Vorfahr | Urvater
AKT: Teil eines Theaterstücks | Nacktdarstellung in der Kunst
ALM: Bergweide | Hochweide in den Alpen
ALT: Nicht jung | Betagt
AMT: Behörde | Dienststelle
ARM: Körperglied | Nicht reich
ART: Gattung, Sorte | Weise, Manier
ASS: Höchste Spielkarte | Spitzenkönner
AST: Teil eines Baumes | Zweigansatz
AUE: Flussniederung | Feuchte Wiese am Fluss
AXT: Werkzeug zum Holzspalten | Beil mit langem Stiel
BAD: Raum mit Wanne | Kurort (Kurzform)
BAR: Schanktisch | Nachtlokal
BAU: Errichtung eines Gebäudes | Unterirdische Wohnung des Fuchses
BIO: Ökologisch erzeugt (Kurzwort) | Biologie (Kurzwort)
BOA: Riesenschlange | Pelz- oder Federschal
BON: Kassenzettel | Gutschein
BOX: Kasten, Behälter | Pferdestand im Stall
BUG: Vorderteil des Schiffes | Programmfehler
BUS: Großes Verkehrsmittel | Omnibus (Kurzwort)
DOM: Große Bischofskirche | Kathedrale
DUO: Zwei Musiker | Paar, Zweiergruppe
EGO: Das Ich | Selbstbewusstsein, Eigenliebe
EHE: Bund fürs Leben | Trauung begründet sie
EID: Schwur | Feierliches Versprechen
EIS: Gefrorenes Wasser | Kalte Süßspeise
ELF: Zahl nach zehn | Fußballmannschaft
EMU: Australischer Laufvogel | Großer Vogel, der nicht fliegen kann
ENG: Nicht weit | Beengt, knapp
ERZ: Metallhaltiges Gestein | Rohstoff für Eisen
FAN: Begeisterter Anhänger | Verehrer eines Stars
FEE: Zauberhaftes Märchenwesen | Gute … (Märchen)
FIX: Schnell, flink | Festgelegt
GAS: Luftförmiger Stoff | Brennstoff im Herd
GEL: Zähflüssige Masse | Haarfestiger
GEN: Erbanlage | Träger der Erbinformation
GIN: Wacholderschnaps | Grundlage des Tonic-Mixgetränks
GNU: Afrikanische Antilope | Steppentier mit Mähne
GUT: Nicht schlecht | Landwirtschaftlicher Großbetrieb
HAI: Raubfisch mit scharfen Zähnen | Gefürchtetes Meerestier
HEU: Getrocknetes Gras | Futter für Pferde
HOF: Platz hinter dem Haus | Bauernanwesen
HUF: Pferdefuß | Fuß des Pferdes, bekommt ein Eisen
HUT: Kopfbedeckung | Was man vor jemandem ziehen kann
IRE: Bewohner Dublins | Einwohner Irlands
JOB: Arbeitsstelle | Beruf, Tätigkeit
JOD: Chemisches Element | Mittel zur Wunddesinfektion
KAI: Uferstraße am Hafen | Anlegestelle für Schiffe
KAP: Vorgebirge am Meer | Ins Meer ragende Landspitze
KUH: Weibliches Rind | Milchlieferantin
KUR: Heilaufenthalt | Erholung im Bad
LAB: Enzym zur Käseherstellung | Stoff, der Milch gerinnen lässt
LOB: Anerkennende Worte | Gegenteil von Tadel
LOS: Glücksschein | Nicht fest; Schicksal
MAI: Wonnemonat | Fünfter Monat
MAL: Zeichen auf der Haut | Zeitpunkt (ein …)
MOB: Aufgehetzte Menge | Pöbel
MUT: Tapferkeit | Furchtlosigkeit
NEU: Nicht alt | Frisch, unbenutzt
NOT: Elend, Mangel | Bedrängnis
NUN: Jetzt | Zum jetzigen Zeitpunkt
NUR: Bloß, lediglich | Ausschließlich
OHR: Hörorgan | Damit hört man
OMA: Großmutter | Mutter der Mutter
OPA: Großvater | Vater des Vaters
ORT: Platz, Stelle | Kleine Gemeinde
OST: Himmelsrichtung | Dort geht die Sonne auf
PIK: Spielkartenfarbe | Schwarzes Blatt im Kartenspiel
POL: Ende der Erdachse | Nord- oder Süd…
PUB: Englische Gaststätte | Britische Kneipe
RAD: Rundes Fahrzeugteil | Fahrrad (Kurzwort)
RAT: Empfehlung | Gremium einer Gemeinde
RAU: Nicht glatt | Uneben
REH: Scheues Waldtier | Mutter des Kitzes
ROH: Ungekocht | Unbearbeitet
ROT: Farbe des Blutes | Farbe der Liebe
RUF: Ansehen | Lauter Zuruf
RUM: Zuckerrohrschnaps | Spirituose aus der Karibik
SAU: Weibliches Schwein | Mutterschwein
SEE: Stehendes Gewässer | Großer Binnensee
SET: Zusammengehörige Teile | Satz, Garnitur
SOG: Saugende Strömung | Unterdruck, Zug
SPA: Wellnessbad | Kurbereich im Hotel
TAG: Zeit zwischen Sonnenauf- und -untergang | 24 Stunden
TAL: Senke zwischen Bergen | Gegenteil von Berg
TAT: Handlung | Vollbrachtes Werk
TAU: Dickes Seil | Morgenfeuchte auf dem Gras
TEE: Heißgetränk aus Blättern | Aufgussgetränk
TOD: Ende des Lebens | Sterben
TON: Klang, Laut | Töpfermaterial
TOP: Spitze, hervorragend | Ärmelloses Oberteil
TOR: Großer Eingang | Treffer beim Fußball
UFO: Unbekanntes Flugobjekt | Fliegende Untertasse
UHR: Zeitmesser | Zeigt die Stunden an
UHU: Große Eule | Nachtvogel mit Federohren
ULK: Scherz, Spaß | Jux
UNI: Hochschule (Kurzwort) | Einfarbig
WAL: Riesiges Meeressäugetier | Größtes Tier der Meere
WEG: Pfad, Straße | Route, Strecke
WEH: Schmerz | Leid, Kummer
WUT: Heftiger Zorn | Rage
ZAR: Russischer Herrscher | Ehemaliger Kaiser Russlands
ZEH: Teil des Fußes | Glied am Fuß
ZOO: Tierpark | Tiergarten
ZUG: Schienenfahrzeug | Eisenbahn; Luftstrom
ÄRA: Zeitalter | Epoche
ÖDE: Langweilig | Verlassen, unfruchtbar
ZÄH: Widerstandsfähig | Schwer zu kauen
RAR: Selten | Knapp, kostbar
ARG: Schlimm, böse | Sehr (umgangssprachlich)
FIT: In guter Form | Sportlich, gesund
NAH: Nicht weit entfernt | In der Nähe
GAR: Fertig gekocht | Völlig, ganz und …
OFT: Häufig | Viele Male
NIE: Zu keiner Zeit | Niemals
HIN: In Richtung dorthin | … und zurück
HER: In Richtung zu mir | Hin und …
TUN: Machen | Handeln
BIN: Erste Person von „sein“ | Ich …
IST: Dritte Person von „sein“ | Er, sie, es …
HAT: Besitzt | Er, sie, es … (haben)
WAR: Vergangenheit von „sein“ | Er … einmal
KAM: Vergangenheit von „kommen“ | Traf ein
GAB: Vergangenheit von „geben“ | Überreichte
SAH: Vergangenheit von „sehen“ | Erblickte
LAG: Vergangenheit von „liegen“ | Ruhte
ZOG: Vergangenheit von „ziehen“ | Schleppte
LAS: Vergangenheit von „lesen“ | Studierte ein Buch
BAT: Vergangenheit von „bitten“ | Ersuchte
RAN: Vergangenheit von „rennen“ | Lief schnell
SEI: Imperativ von „sein“ | … so gut!
GIB: Imperativ von „geben“ | … her!
GEH: Imperativ von „gehen“ | … weg!
SAG: Imperativ von „sagen“ | … es mir!
HÖR: Imperativ von „hören“ | … zu!
TUE: Erste Person von „tun“ | Ich … es
TUT: Dritte Person von „tun“ | Er, sie, es … es
ÜBE: Erste Person von „üben“ | Ich … Klavier
MIT: Gemeinsam, samt | Nicht ohne
FÜR: Zugunsten von | Pro
VON: Ausgehend von | Herkunft angebende Präposition
VOR: Zeitlich früher | Nicht hinter
AUF: Nicht zu | Oben …
AUS: Beendet | Von innen nach außen
BEI: In der Nähe von | Neben
BIS: Zeitlich bis zu | … bald!
ZUM: Zu dem | Verschmelzung von „zu dem“
ZUR: Zu der | Verschmelzung von „zu der“
UND: Bindewort | Sowie
ALS: Vergleichswort | Zu der Zeit, da
WAS: Fragewort nach Sachen | … ist das?
WER: Fragewort nach Personen | … ist da?
WIE: Fragewort nach der Art | Auf welche Weise
WEM: Fragewort im dritten Fall | … gehört das?
WEN: Fragewort im vierten Fall | … suchst du?
WIR: Ich und du | Erste Person Mehrzahl
IHR: Zweite Person Mehrzahl | Besitzanzeigend (weiblich)
UNS: Vierter Fall von „wir“ | Mir und dir
MIR: Dritter Fall von „ich“ | Gib es …!
DIR: Dritter Fall von „du“ | Ich helfe …
IHN: Vierter Fall von „er“ | Ich sehe …
IHM: Dritter Fall von „er“ | Ich gebe es …
ICH: Erste Person Einzahl | Das Ego
SIE: Dritte Person weiblich | Höfliche Anrede
DER: Männlicher Artikel | Bestimmter Artikel
DIE: Weiblicher Artikel | Bestimmter Artikel Mehrzahl
DAS: Sächlicher Artikel | Jenes
DEM: Artikel im dritten Fall | Bestimmter Artikel (Dativ)
DEN: Artikel im vierten Fall | Bestimmter Artikel (Akkusativ)
DES: Artikel im zweiten Fall | Bestimmter Artikel (Genitiv)
EIN: Unbestimmter Artikel | Nicht aus (Schalter)
ALL: Weltraum | Universum
ABI: Reifeprüfung (Kurzwort) | Abitur (Kurzwort)
LKW: Lastkraftwagen (Abkürzung) | Brummi
PKW: Personenkraftwagen (Abkürzung) | Auto (Abkürzung)
LOK: Zugmaschine der Eisenbahn | Lokomotive (Kurzwort)
MIX: Mischung | Gemisch
POP: Moderne Unterhaltungsmusik | Musikrichtung
RAP: Sprechgesang | Musikstil aus dem Hip-Hop
SKI: Schneebrett für den Winter | Brett zum Wintersport
TÜR: Eingang zum Zimmer | Hat Klinke und Schloss
TÜV: Prüfstelle für Fahrzeuge (Abkürzung) | Technischer Überwachungsverein (Abkürzung)
WEB: Internet (Kurzwort) | World Wide … (Internet)
ZEN: Buddhistische Meditationslehre | Japanische Meditationsrichtung
OHM: Einheit des elektrischen Widerstands | Physikalische Maßeinheit
PIN: Geheimzahl | Kleiner Anstecker
HIT: Erfolgreiches Lied | Schlager, Erfolgsnummer
JET: Düsenflugzeug | Schnelles Flugzeug
KIT: Bausatz | Ausrüstungsset
BÄR: Großes Raubtier mit Pelz | Brummiges Waldtier
ARE: Alte Flächeneinheit (100 m²) | Flächenmaß
ABS: Bremssystem im Auto (Abkürzung) | Antiblockiersystem (Abkürzung)
BRR: Ausruf bei Kälte | Laut des Fröstelns
ZWO: Zwei (Funksprache) | Zahl beim Funken
NIX: Nichts (umgangssprachlich) | Wassergeist
PST: Aufforderung, leise zu sein | Leise!
HUI: Ausruf der Überraschung | Schnell wie der Wind
OJE: Ausruf des Bedauerns | O weh!
AHA: Ausruf des Verstehens | Jetzt verstehe ich!
TJA: Ausruf des Zögerns | Na ja
WOW: Ausruf der Begeisterung | Erstaunlich!
MAG: Hat gern | Erste Person von „mögen“
ANS: An das | Verschmelzung von „an das“
INS: In das | Verschmelzung von „in das“
UMS: Um das | Verschmelzung von „um das“
VOM: Von dem | Verschmelzung von „von dem“
BÖS: Böse (Kurzform) | Übel, schlimm
TOT: Nicht mehr lebend | Gestorben
ACHT: Zahl zwischen sieben und neun | Aufmerksamkeit (… geben)
ADEL: Vornehmer Stand | Fürsten und Grafen gehören dazu
ADER: Blutgefäß | Blutbahn
ALGE: Wasserpflanze | Grünes Gewächs im Teich
ALLE: Sämtliche | Jeder ohne Ausnahme
AMPEL: Verkehrssignal | Zeigt Rot, Gelb, Grün
ANZUG: Herrenbekleidung | Sakko mit passender Hose
ARZT: Mediziner | Doktor im Krankenhaus
ATEM: Luft zum Leben | Hauch, Luftholen
AULA: Festsaal der Schule | Versammlungsraum
AUTO: Kraftfahrzeug | Wagen mit Motor
BAHN: Eisenbahn | Spur, Gleis
BALL: Rundes Spielgerät | Festliche Tanzveranstaltung
BAND: Musikgruppe | Schmaler Stoffstreifen
BANK: Geldinstitut | Sitzmöbel im Park
BART: Haarwuchs im Gesicht | Männlicher Gesichtsschmuck
BASS: Tiefe Männerstimme | Tief klingendes Instrument
BAUM: Hohe Holzpflanze | Hat Stamm, Äste und Blätter
BEET: Pflanzfläche im Garten | Gemüse- oder Blumenfläche
BEIL: Kleine Axt | Hackwerkzeug
BEIN: Körperglied zum Gehen | Gliedmaße
BERG: Hohe Erhebung | Gegenteil von Tal
BETT: Schlafmöbel | Darin schläft man
BIER: Hopfengetränk | Gerstensaft
BILD: Gemälde | Foto, Abbildung
BLAU: Farbe des Himmels | Farbe des Meeres
BLEI: Schweres Metall | Weiches, giftiges Metall
BLUT: Rote Körperflüssigkeit | Fließt in den Adern
BOCK: Männliches Reh oder Ziege | Turngerät
BOOT: Kleines Wasserfahrzeug | Kahn, Nussschale
BORD: Rand des Schiffs | Regalbrett
BOTE: Überbringer von Nachrichten | Kurier
BREI: Weiche Speise | Mus, Pampe
BROT: Backware aus Mehl | Grundnahrungsmittel vom Bäcker
BUCH: Gebundenes Druckwerk | Lesestoff mit Seiten
BUDE: Kleines Verkaufshäuschen | Einfache Hütte
BUNT: Vielfarbig | Nicht einfarbig
BURG: Mittelalterliche Wehranlage | Ritterwohnsitz
BÜRO: Arbeitsraum | Kanzlei, Amtsstube
CHEF: Vorgesetzter | Leiter einer Firma
CHOR: Sängergruppe | Gemeinsam Singende
CLUB: Verein | Nachtlokal
CODE: Geheimschlüssel | Verschlüsselung
DACH: Oberer Hausabschluss | Schützt das Haus vor Regen
DAME: Höfliche Bezeichnung einer Frau | Brettspiel; Spielkarte
DANK: Ausdruck der Anerkennung | Danke sagen
DECK: Stockwerk auf einem Schiff | Oberste Schiffsfläche
DIEB: Räuber, Langfinger | Jemand, der stiehlt
DICK: Nicht dünn | Beleibt
DING: Gegenstand | Sache
DORF: Kleiner Ort | Ländliche Siedlung
DOSE: Blechbehälter | Konservenbüchse
DREI: Zahl nach zwei | Anzahl der Musketiere
DUFT: Angenehmer Geruch | Wohlgeruch
DUMM: Nicht klug | Töricht
DÜNN: Nicht dick | Schlank, schmal
EBBE: Niedrigwasser | Gegenteil von Flut
ECHO: Widerhall | Schallreflexion in den Bergen
ECHT: Nicht gefälscht | Wahr, original
ECKE: Winkel | Stelle, wo zwei Wände zusammentreffen
EHRE: Ansehen, Würde | Hochachtung
EIER: Mehrzahl von Ei | Produkte des Huhns
EILE: Hast | Schnelligkeit, Hetze
EINS: Erste Zahl | Beste Schulnote
ELCH: Hirschart des Nordens | Großes Geweihtier Skandinaviens
ENDE: Schluss | Abschluss, Ausgang
ENTE: Schwimmvogel | Wasservogel, der schnattert
ERBE: Nachlass | Hinterlassenschaft
ERDE: Unser Planet | Boden, Humus
ESEL: Graues Lasttier | Tier mit langen Ohren
FACH: Unterrichtsgegenstand | Abteil im Schrank
FALL: Sturz | Juristische Angelegenheit
FANG: Beute | Erbeutetes beim Fischen
FASS: Großer Holzbehälter | Tonne für Bier oder Wein
FAST: Beinahe | Nahezu
FAUL: Arbeitsscheu | Verdorben (Obst)
FEIN: Zart, dünn | Vornehm, edel
FELD: Acker | Spielfläche
FELL: Tierhaar | Pelz des Tieres
FEST: Feier | Nicht lose
FILM: Kinowerk | Streifen fürs Kino
FLUG: Reise durch die Luft | Fahrt mit dem Flugzeug
FLUT: Hochwasser | Gegenteil von Ebbe
FOTO: Lichtbild | Aufnahme mit der Kamera
FRAU: Weiblicher Mensch | Ehepartnerin
FREI: Nicht gefangen | Unbesetzt
FRÜH: Zeitig | Nicht spät
FUND: Entdecktes | Gefundenes
FÜNF: Zahl nach vier | Finger an einer Hand
GABE: Geschenk | Talent
GANG: Flur | Fahrstufe im Auto
GANS: Großer Schwimmvogel | Martinsbraten
GANZ: Vollständig | Nicht zerbrochen
GAST: Besucher | Eingeladener
GELB: Farbe der Zitrone | Farbe der Sonne
GELD: Zahlungsmittel | Münzen und Scheine
GIFT: Tödlicher Stoff | Schädliche Substanz
GLAS: Trinkgefäß | Durchsichtiges Material
GOLD: Edelmetall | Wertvolles gelbes Metall
GOTT: Höchstes Wesen | Allmächtiger
GRAB: Letzte Ruhestätte | Stelle auf dem Friedhof
GRAD: Maßeinheit für Temperatur und Winkel | Stufe, Rang
GRAS: Grüne Wiesenpflanze | Rasenbewuchs
GRAU: Farbe zwischen Schwarz und Weiß | Farbe einer Maus
GROB: Nicht fein | Unhöflich, derb
GRÜN: Farbe der Wiese | Farbe der Hoffnung
GURT: Riemen zum Anschnallen | Sicherheitsriemen im Auto
HAAR: Wächst auf dem Kopf | Kopfbedeckung von Natur aus
HAFT: Gefängnisstrafe | Freiheitsentzug
HAHN: Männliches Huhn | Wasserzapfstelle
HALS: Verbindung von Kopf und Rumpf | Darum trägt man eine Kette
HAND: Greiforgan | Hat fünf Finger
HANG: Abfallendes Gelände | Bergseite
HART: Nicht weich | Fest, streng
HASE: Langohr im Feld | Flinker Nager mit langen Ohren
HAUS: Gebäude zum Wohnen | Heim
HAUT: Äußere Körperhülle | Größtes Organ des Menschen
HEER: Armee | Große Truppe
HEFT: Schreibbuch der Schüler | Gehefteter Papierblock
HEIM: Zuhause | Wohnstätte
HELD: Mutiger Kämpfer | Hauptfigur einer Geschichte
HELL: Nicht dunkel | Lichtdurchflutet
HEMD: Oberbekleidung mit Knöpfen | Kleidungsstück mit Kragen
HERD: Kochstelle | Gerät zum Kochen
HERR: Höfliche Anrede für Männer | Gebieter
HERZ: Pumpendes Organ | Symbol der Liebe
HIEB: Schlag | Streich mit der Hand
HIER: An dieser Stelle | Nicht dort
HIRN: Denkorgan | Gehirn
HOCH: Nicht niedrig | Weit oben
HOSE: Beinkleid | Kleidungsstück für die Beine
HUHN: Haustier, das Eier legt | Geflügel
HUND: Haustier, das bellt | Bester Freund des Menschen
HUPE: Signalgeber im Auto | Warninstrument am Lenkrad
IDEE: Einfall | Gedanke, Vorstellung
IGEL: Stacheltier | Kleines Tier, das sich zusammenrollt
JAGD: Hetze auf Wild | Waidwerk
JAHR: Zwölf Monate | 365 Tage
JUNG: Nicht alt | Im frühen Lebensalter
KAHN: Flaches Boot | Einfaches Wasserfahrzeug
KALB: Junges Rind | Nachwuchs der Kuh
KALT: Nicht warm | Frostig
KAMM: Gerät zum Frisieren | Haarordner
KANU: Paddelboot | Schmales Boot der Indianer
KARO: Spielkartenfarbe | Rautenmuster
KERL: Mann (umgangssprachlich) | Bursche
KERN: Innerstes | Samen in der Frucht
KIEL: Unterster Schiffsbalken | Norddeutsche Stadt
KIND: Junger Mensch | Nachwuchs
KINN: Unterer Teil des Gesichts | Teil unter dem Mund
KINO: Filmtheater | Lichtspielhaus
KLAR: Deutlich | Durchsichtig, rein
KLEE: Wiesenpflanze mit drei Blättern | Glücksbringer (vierblättriger …)
KLUG: Gescheit | Intelligent
KNIE: Beingelenk | Gelenk zwischen Ober- und Unterschenkel
KOCH: Zubereiter von Speisen | Küchenchef
KOHL: Gemüsesorte | Kraut, Gemüsepflanze
KOPF: Oberster Körperteil | Haupt
KORB: Geflochtener Behälter | Weidengeflecht zum Tragen
KORN: Getreide | Samen des Getreides
KRAN: Hebemaschine | Baustellengerät zum Heben
KRUG: Trinkgefäß mit Henkel | Behälter für Bier
KURS: Lehrgang | Richtung eines Schiffes
KURZ: Nicht lang | Von geringer Länge
KUSS: Zärtliche Berührung mit den Lippen | Busserl
LACK: Glänzender Anstrich | Farbe mit Glanz
LAGE: Situation | Position, Stelle
LAMM: Junges Schaf | Nachwuchs des Schafs
LAND: Staat | Gegenteil von Stadt oder Meer
LANG: Nicht kurz | Von großer Länge
LAST: Schwere Bürde | Zu tragendes Gewicht
LAUB: Blätter der Bäume | Fällt im Herbst
LAUF: Rennen | Gang, Verlauf
LAUT: Nicht leise | Geräuschvoll
LEER: Ohne Inhalt | Nicht voll
LEIB: Körper | Rumpf
LEID: Kummer, Schmerz | Unglück
LIED: Gesungenes Musikstück | Gesangsstück
LIEB: Nett, freundlich | Gern gehabt
LIFT: Aufzug | Fahrstuhl
LILA: Violette Farbe | Farbe der Veilchen
LIST: Schlauer Trick | Kniff
LOCH: Öffnung | Vertiefung, Lücke
LOHN: Bezahlung für Arbeit | Gehalt
LOSE: Nicht fest | Mehrzahl von Los
LUFT: Was wir atmen | Gasgemisch um die Erde
LUPE: Vergrößerungsglas | Hilfsmittel für Detektive
LUST: Verlangen | Freude an etwas
MAGD: Dienerin auf dem Bauernhof | Hausgehilfin (veraltet)
MAHL: Festessen | Mahlzeit
MAIS: Gelbes Getreide | Kolbenfrucht
MANN: Männlicher Erwachsener | Ehepartner
MAUL: Mund des Tieres | Tierschnauze
MAUS: Kleiner Nager | Computerzeigegerät
MEER: Ozean | Salzwasser, so weit das Auge reicht
MEHL: Gemahlenes Getreide | Backzutat
MEHR: Zusätzlich | Größere Menge
MILD: Sanft, nicht scharf | Gemäßigt
MIST: Dünger vom Stall | Ärgerlicher Ausruf
MOND: Erdtrabant | Himmelskörper der Nacht
MOOR: Sumpfgebiet | Feuchtes Torfland
MOOS: Niedrige Waldpflanze | Grüner Teppich auf Steinen
MÜDE: Schläfrig | Erschöpft
MÜLL: Abfall | Unrat, Dreck
MUND: Öffnung zum Essen und Sprechen | Hat Lippen und Zähne
MUSE: Göttin der Künste | Inspirationsquelle
NAME: Bezeichnung einer Person | Vor- oder Zuname
NASE: Riechorgan | Sitzt mitten im Gesicht
NASS: Feucht | Nicht trocken
NEID: Missgunst | Eifersucht auf Besitz anderer
NEST: Vogelwohnung | Brutstätte
NETT: Freundlich | Liebenswürdig
NETZ: Geflecht aus Fäden | Fanggerät der Fischer
NOTE: Musikzeichen | Schulbewertung
NULL: Zahl ohne Wert | Nichts
OBEN: Nicht unten | In der Höhe
OBST: Früchte | Äpfel, Birnen und Co.
OFEN: Heizgerät | Backgerät
OPER: Musiktheater | Gesungenes Bühnenwerk
PAAR: Zwei zusammengehörige | Zwei Verliebte
PACK: Bündel | Gesindel
PAKT: Vertrag, Bündnis | Abkommen
PARK: Grünanlage | Gepflegtes Gelände mit Bäumen
PASS: Reisedokument | Übergang im Gebirge
PECH: Unglück | Schwarze, klebrige Masse
PELZ: Tierfell | Warme Felljacke
PFAD: Schmaler Weg | Trampelweg
PILZ: Waldgewächs mit Hut | Champignon oder Steinpilz
PLAN: Vorhaben | Entwurf, Karte
POST: Briefbeförderung | Sendungen im Briefkasten
PULT: Schreibtisch mit schräger Platte | Rednertisch
PUMA: Amerikanische Raubkatze | Berglöwe
RABE: Schwarzer Vogel | Krächzender Vogel
RAND: Äußere Begrenzung | Kante, Saum
RANG: Stellung, Stufe | Theaterstockwerk
RAST: Pause auf der Reise | Ruhepause
RAUM: Zimmer | Platz, Weite
REIS: Asiatisches Grundnahrungsmittel | Getreide aus Asien
REST: Übriggebliebenes | Was bleibt
RING: Schmuck für den Finger | Boxplatz
RISS: Spalt | Sprung im Material
ROCK: Damenbekleidung | Musikrichtung
ROHR: Hohler Zylinder | Leitung für Wasser
ROSA: Helles Rot | Farbe für Mädchen
ROSE: Blume mit Dornen | Königin der Blumen
RUHE: Stille | Entspannung
RUHM: Berühmtheit | Hohes Ansehen
RUIN: Zusammenbruch | Finanzieller Untergang
SAAL: Großer Raum | Festraum
SACK: Grober Beutel | Behälter aus Stoff
SAFT: Getränk aus Obst | Fruchtgetränk
SALZ: Gewürz aus dem Meer | Weißes Würzmittel
SAMT: Weicher Stoff | Zusammen mit
SAND: Feinkörniges Material am Strand | Wüstenboden
SATZ: Sprachliche Einheit | Sprung
SEHR: In hohem Maße | Äußerst
SEIL: Starke Schnur | Tau, Strick
SENF: Scharfe Würzpaste | Gelbe Würze zur Wurst
SIEB: Küchengerät mit Löchern | Durchseihgerät
SIEG: Gewinn im Wettkampf | Triumph
SINN: Bedeutung | Wahrnehmungsfähigkeit
SITZ: Platz zum Sitzen | Wohnort einer Firma
SOFA: Polstermöbel | Couch
SOHN: Männliches Kind | Nachkomme
SPÄT: Nicht früh | Zu vorgerückter Stunde
SPUR: Fährte | Abdruck, Hinweis
STAB: Stock | Mitarbeitergruppe
STAR: Berühmte Person | Singvogel
STAU: Verkehrsstockung | Stillstand auf der Autobahn
STIL: Ausdrucksweise | Art und Weise
TAKT: Rhythmus | Feingefühl
TANZ: Bewegung zur Musik | Walzer oder Tango
TAXI: Mietwagen mit Fahrer | Droschke
TEIG: Masse zum Backen | Mehl, Wasser und Hefe vermischt
TEIL: Stück vom Ganzen | Abschnitt
TIEF: Nicht flach | Gegenteil von hoch
TIER: Lebewesen, kein Mensch | Hund, Katze oder Maus
TIPP: Ratschlag | Hinweis
TOLL: Großartig | Wunderbar
TOPF: Kochgefäß | Behälter mit Deckel
TUCH: Stoffstück | Textilstück
TURM: Hohes, schmales Bauwerk | Schachfigur
UFER: Rand eines Gewässers | Küste, Strand
VASE: Blumengefäß | Behälter für den Strauß
VIEH: Nutztiere | Kühe und Schweine
VIER: Zahl nach drei | Beine eines Stuhls
VOLK: Nation | Bevölkerung
VOLL: Gefüllt | Nicht leer
WACH: Nicht schlafend | Aufmerksam
WAHL: Abstimmung | Auswahl
WAHR: Richtig, nicht gelogen | Zutreffend
WALD: Viele Bäume | Forst
WAND: Seitliche Begrenzung des Zimmers | Mauer
WARE: Handelsgut | Verkaufsartikel
WARM: Nicht kalt | Angenehm temperiert
WEIT: Nicht nah | Entfernt, ausgedehnt
WELT: Erde | Alles, was existiert
WERK: Fabrik | Schöpfung eines Künstlers
WERT: Preis | Bedeutung, Nutzen
WILD: Nicht zahm | Tiere des Waldes
WIND: Luftbewegung | Bewegte Luft
WITZ: Scherz | Lustige Geschichte
WOLF: Wildes Rudeltier | Vorfahr des Hundes
WORT: Sprachliche Einheit | Besteht aus Buchstaben
WURM: Kriechtier ohne Beine | Regen…
ZAHL: Nummer | Ziffer, Menge
ZAHN: Beißwerkzeug im Mund | Wird vom Zahnarzt behandelt
ZART: Weich und fein | Empfindlich
ZAUN: Grundstücksbegrenzung | Umfriedung aus Latten
ZEIT: Stunden, Tage, Jahre | Vergeht unaufhörlich
ZELT: Unterkunft beim Camping | Stoffbehausung
ZIEL: Angestrebter Punkt | Ende des Rennens
ZINK: Metall gegen Rost | Chemisches Element (Zn)
ZINN: Weiches Metall | Material für Soldatenfiguren
ZINS: Preis für geliehenes Geld | Bankertrag
ZOLL: Grenzabgabe | Altes Längenmaß
ZONE: Gebiet, Bereich | Abgegrenztes Areal
ZOPF: Geflochtene Haare | Haarflechte
ZORN: Wut | Heftiger Ärger
ZWEI: Zahl nach eins | Paar
ZAHM: Nicht wild | Gezähmt
ÜBEL: Schlecht | Böse, schlimm
OHNE: Nicht mit | Ausschließlich … Zusatz
DANN: Danach | Zu jener Zeit
DORT: An jener Stelle | Nicht hier
BALD: In Kurzem | Demnächst
EBEN: Flach | Gerade eben
ETWA: Ungefähr | Circa
KAUM: Fast nicht | Schwerlich
DRIN: Innen (umgangssprachlich) | Darin
SEIN: Existieren | Besitzanzeigend (männlich)
GEHT: Dritte Person von „gehen“ | Es … los!
KANN: Vermag | Erste Person von „können“
MUSS: Ist gezwungen | Erste Person von „müssen“
SOLL: Ist verpflichtet | Gegenteil von Haben (Buchhaltung)
WILL: Möchte | Erste Person von „wollen“
DARF: Hat die Erlaubnis | Erste Person von „dürfen“
WIRD: Dritte Person von „werden“ | Es … Zeit!
GIBT: Dritte Person von „geben“ | Es … viel zu tun
SAGT: Dritte Person von „sagen“ | Spricht
HÖRT: Dritte Person von „hören“ | Vernimmt
LEBT: Dritte Person von „leben“ | Existiert
LEBE: Erste Person von „leben“ | Ich … gern hier
LIES: Imperativ von „lesen“ | … das Buch!
LIEF: Vergangenheit von „laufen“ | Rannte
FIEL: Vergangenheit von „fallen“ | Stürzte
FLOG: Vergangenheit von „fliegen“ | Schwebte durch die Luft
FUHR: Vergangenheit von „fahren“ | Lenkte das Auto
GING: Vergangenheit von „gehen“ | Schritt, lief
FAND: Vergangenheit von „finden“ | Entdeckte
SANG: Vergangenheit von „singen“ | Trällerte
RIEF: Vergangenheit von „rufen“ | Schrie laut
KOMM: Imperativ von „kommen“ | … her!
MACH: Imperativ von „machen“ | … schon!
LASS: Imperativ von „lassen“ | … das!
WARF: Vergangenheit von „werfen“ | Schleuderte
TRAF: Vergangenheit von „treffen“ | Begegnete
TRUG: Vergangenheit von „tragen“ | Schleppte
HALF: Vergangenheit von „helfen“ | Unterstützte
HING: Vergangenheit von „hängen“ | Baumelte
LITT: Vergangenheit von „leiden“ | Hatte Schmerzen
GALT: Vergangenheit von „gelten“ | War gültig
HOLT: Dritte Person von „holen“ | Bringt herbei
ISST: Dritte Person von „essen“ | Nimmt Nahrung zu sich
RUFT: Dritte Person von „rufen“ | Schreit laut
LOBT: Dritte Person von „loben“ | Spricht Anerkennung aus
BAUT: Dritte Person von „bauen“ | Errichtet
ÄSTE: Mehrzahl von Ast | Zweige am Baum
ÖFEN: Mehrzahl von Ofen | Mehrere Heizgeräte
ÜBER: Oberhalb von | Nicht unter
BÖSE: Schlecht, übel | Nicht gut
ABEND: Tagesende | Zeit vor der Nacht
ACKER: Bestelltes Feld | Bauernland
ADLER: Großer Greifvogel | König der Lüfte
AFFEN: Mehrzahl von Affe | Kletternde Zootiere
AHORN: Laubbaum mit Fächerblättern | Baum auf der kanadischen Flagge
AKTIE: Wertpapier | Anteil an einer Firma
ALARM: Warnsignal | Notruf
ALPEN: Höchstes Gebirge Europas | Gebirge zwischen Deutschland und Italien
AMPEL: Verkehrssignal | Zeigt Rot, Gelb, Grün
AMSEL: Schwarzer Singvogel | Vogel mit gelbem Schnabel
ANGEL: Fischfanggerät | Rute mit Haken
ANGST: Furcht | Bangigkeit
ANKER: Hält das Schiff fest | Schweres Eisen am Schiff
ANZUG: Herrenbekleidung | Sakko mit passender Hose
APFEL: Rundes Obst | Frucht vom Baum, oft rot
ARENA: Kampfplatz | Rundes Stadion
ARMEE: Heer | Streitkräfte
ASCHE: Verbrennungsrest | Rückstand des Feuers
ATLAS: Kartensammlung | Buch mit Landkarten
ATOM: Kleinstes Teilchen eines Elements | Baustein der Materie
AUGEN: Mehrzahl von Auge | Sehorgane
BADEN: Im Wasser schwimmen | Sich in der Wanne waschen
BAUCH: Körpermitte | Sitz des Magens
BÄUME: Mehrzahl von Baum | Wald besteht daraus
BEERE: Kleine runde Frucht | Erd- oder Himbeere
BERGE: Mehrzahl von Berg | Gebirge
BESEN: Kehrgerät | Fluggerät der Hexe
BIBEL: Heilige Schrift | Buch der Bücher
BIENE: Honigsammlerin | Summendes Insekt
BIRKE: Baum mit weißer Rinde | Laubbaum
BIRNE: Obstsorte | Glühlampe (umgangssprachlich)
BLATT: Teil der Pflanze | Seite aus Papier
BLICK: Augenaufschlag | Aussicht
BLITZ: Lichterscheinung beim Gewitter | Elektrische Entladung am Himmel
BLUME: Blühende Pflanze | Rose, Tulpe oder Nelke
BLUSE: Damenoberteil | Leichtes Oberbekleidungsstück
BODEN: Erdreich | Fußboden
BOGEN: Waffe für Pfeile | Gekrümmte Linie
BOHNE: Hülsenfrucht | Grünes Gemüse; Kaffee…
BOMBE: Sprengkörper | Explosive Waffe
BRAND: Feuer | Großer Schaden durch Feuer
BRAUT: Frau am Hochzeitstag | Trägt oft Weiß
BRIEF: Postsendung | Schriftliche Mitteilung
BÜHNE: Spielfläche im Theater | Podium für Schauspieler
BULLE: Männliches Rind | Stier
DAMPF: Verdunstetes Wasser | Wasser in Gasform
DATUM: Tagesangabe | Kalenderangabe
DAUER: Zeitspanne | Länge eines Zeitraums
DECKE: Zimmerobergrenze | Wärmende Hülle im Bett
DIEBE: Mehrzahl von Dieb | Langfinger
DINGE: Mehrzahl von Ding | Sachen
DRAHT: Dünner Metallfaden | Metallschnur
DRUCK: Pressen | Vervielfältigung von Texten
DURST: Verlangen nach Trinken | Trockenheit im Mund
EBENE: Flaches Land | Flachland
ECKEN: Mehrzahl von Ecke | Winkel
EHREN: Würdigen | Auszeichnen
EIMER: Behälter mit Henkel | Kübel
EISEN: Metall | Werkstoff für Stahl
ENGEL: Himmlisches Wesen | Bote Gottes
ENKEL: Kind des Kindes | Großmutters Nachwuchs
ERBSE: Grüne Hülsenfrucht | Kleines rundes Gemüse
ERNTE: Einbringen der Feldfrüchte | Ertrag des Feldes
ESSEN: Nahrung aufnehmen | Mahlzeit
ETAGE: Stockwerk | Geschoss
EULE: Nachtvogel | Vogel der Weisheit
FADEN: Dünner Zwirn | Garn zum Nähen
FAHNE: Flagge | Banner
FALLE: Fanggerät | Hinterhalt
FARBE: Rot, Blau oder Gelb | Anstrichmittel
FAUST: Geballte Hand | Goethes Drama
FEDER: Vogelkleid | Schreibgerät von früher
FEIER: Fest | Party
FEIND: Gegner | Widersacher
FELS: Großer Stein | Harte Gesteinsmasse
FERSE: Hinterer Teil des Fußes | Hacke
FEUER: Flamme | Brand
FIBEL: Lesebuch für Anfänger | Erstes Schulbuch
FISCH: Wassertier mit Flossen | Tier mit Schuppen und Kiemen
FLUSS: Fließendes Gewässer | Rhein oder Donau
FRAGE: Erkundigung | Sucht eine Antwort
FRIST: Zeitlimit | Festgelegter Zeitraum
FROST: Kälte unter null Grad | Eisige Kälte
FUCHS: Schlaues Waldtier | Rotes Raubtier
GABEL: Essbesteck mit Zinken | Besteckteil
GEBET: Zwiesprache mit Gott | Bitte an Gott
GEIST: Gespenst | Verstand, Intellekt
GERÄT: Apparat | Werkzeug, Maschine
GLÜCK: Günstiges Schicksal | Freude, Wohlergehen
GRUND: Ursache | Boden, Erdreich
GURKE: Grünes Gemüse | Salatgemüse
HAFEN: Anlegestelle für Schiffe | Schutzort für Boote
HALLE: Großer Raum | Weitläufiges Gebäude
HEBEL: Werkzeug zum Heben | Griff an Maschinen
HENNE: Weibliches Huhn | Legt Eier
HITZE: Große Wärme | Hohe Temperatur
HOBEL: Werkzeug zum Glätten | Tischlerwerkzeug
HOTEL: Beherbergungsbetrieb | Haus für Reisende
HÜGEL: Kleiner Berg | Erhebung im Gelände
HUMOR: Sinn für Komik | Lustige Lebenseinstellung
IMKER: Bienenzüchter | Honigproduzent
INSEL: Land im Wasser | Von Wasser umgebenes Land
JACKE: Oberbekleidung | Kleidung mit Ärmeln und Reißverschluss
JAGEN: Wild erlegen | Verfolgen
KABEL: Elektrische Leitung | Stromdraht
KAMEL: Wüstentier mit Höckern | Lasttier der Wüste
KAMIN: Offene Feuerstelle | Schornstein
KAMPF: Auseinandersetzung | Gefecht
KARTE: Landkarte | Spielkarte; Fahrkarte
KATZE: Haustier, das miaut | Schnurrender Vierbeiner
KEHLE: Hals, Schlund | Gurgel
KERZE: Wachslicht | Brennt am Adventskranz
KETTE: Glieder aus Metall | Halsschmuck
KISTE: Großer Kasten | Holzbehälter
KLANG: Ton, Schall | Laut eines Instruments
KLEID: Damenbekleidung | Einteiliges Kleidungsstück
KNOPF: Verschluss an der Jacke | Druck… am Gerät
KOHLE: Brennstoff aus der Erde | Schwarzes Brennmaterial
KÖNIG: Herrscher | Monarch
KRAFT: Stärke | Energie
KRANZ: Blumenring | Adventsschmuck
KREIS: Runde Form | Ring, Bezirk
KREUZ: Zeichen des Christentums | Spielkartenfarbe
KRIEG: Bewaffneter Konflikt | Gegenteil von Frieden
KRONE: Kopfschmuck des Königs | Zahnersatz
KÜCHE: Raum zum Kochen | Dort steht der Herd
KUGEL: Runder Körper | Ball, Sphäre
KÜSTE: Land am Meer | Meeresufer
LAGER: Vorratsraum | Zeltplatz
LAMPE: Leuchte | Lichtquelle
LAUNE: Stimmung | Gemütslage
LEBEN: Existenz | Dasein
LEHRE: Ausbildung | Doktrin
LESEN: Text erfassen | Buch durchgehen
LICHT: Helligkeit | Gegenteil von Dunkelheit
LIEBE: Starke Zuneigung | Tiefes Gefühl für jemanden
LINIE: Gerader Strich | Verkehrsroute
LIPPE: Teil des Mundes | Mundrand
LISTE: Aufzählung | Verzeichnis
LÖWE: Raubkatze mit Mähne | König der Tiere
LUNGE: Atemorgan | Organ im Brustkorb
MAGEN: Verdauungsorgan | Da landet das Essen
MAUER: Steinwand | Gemauerte Wand
MESSE: Katholischer Gottesdienst | Große Ausstellung
METER: Längeneinheit | 100 Zentimeter
MIETE: Zahlung für die Wohnung | Monatliche Wohnkosten
MILCH: Weißes Getränk von der Kuh | Flüssigkeit für Käse und Butter
MITTE: Zentrum | Mittelpunkt
MODEL: Fotomodell | Läuft auf dem Laufsteg
MONAT: Zwölfter Teil des Jahres | Etwa 30 Tage
MOTOR: Antriebsmaschine | Herz des Autos
MÜCKE: Stechendes Insekt | Summender Blutsauger
MÜHLE: Mahlwerk | Gebäude mit Windrädern
MUSIK: Tonkunst | Klänge und Melodien
NACHT: Dunkle Tageszeit | Zeit zum Schlafen
NADEL: Nähwerkzeug | Spitzes Werkzeug
NAGEL: Metallstift | Wächst am Finger
NEBEL: Trübe Luft | Dunst, schlechte Sicht
NELKE: Blume | Gewürz
NIERE: Organ zur Entgiftung | Paariges Organ
NUDEL: Teigware | Spaghetti oder Makkaroni
OPFER: Geschädigter | Gabe für Götter
ORGEL: Kircheninstrument | Größtes Musikinstrument
OSTEN: Himmelsrichtung | Dort geht die Sonne auf
PALME: Tropischer Baum | Baum am Südseestrand
PAPST: Oberhaupt der katholischen Kirche | Bischof von Rom
PARTY: Fest, Feier | Gesellige Zusammenkunft
PAUSE: Unterbrechung | Rast
PFERD: Reittier | Ross, Gaul
PFLUG: Ackergerät | Gerät zum Umgraben des Feldes
PLATZ: Freie Fläche | Sitzgelegenheit
PREIS: Kosten | Auszeichnung, Gewinn
PROBE: Test | Übung vor der Aufführung
PUNKT: Kleiner Fleck | Satzzeichen
PUPPE: Spielzeug für Kinder | Figur zum Spielen
RATTE: Großer Nager | Ungeliebtes Nagetier
RAUCH: Qualm | Entsteht beim Feuer
REGAL: Möbel mit Brettern | Bücherbord
REGEL: Vorschrift | Richtlinie
REGEN: Niederschlag | Fällt aus Wolken
REICH: Wohlhabend | Großes Herrschaftsgebiet
REIFE: Vollendung des Wachstums | Erwachsensein
REIHE: Linie aus mehreren | Serie
REISE: Fahrt in die Ferne | Urlaubstour
RIESE: Sehr großer Mensch | Märchenfigur von gewaltiger Größe
ROMAN: Langes Erzählwerk | Umfangreiches Buch
RUDER: Gerät zum Bootfahren | Steuervorrichtung am Boot
SACHE: Ding | Angelegenheit
SALAT: Blattgemüse | Kalte Gemüsespeise
SCHAF: Wolltier | Blökendes Haustier
SCHUH: Fußbekleidung | Wird am Fuß getragen
SEELE: Inneres des Menschen | Psyche
SEGEL: Tuch am Mast | Fängt den Wind am Boot
SEITE: Blatt im Buch | Flanke
SOCKE: Fußbekleidung | Strumpf
SONNE: Stern unseres Systems | Tagesgestirn
SPIEL: Zeitvertreib | Match, Partie
SPORT: Körperliche Betätigung | Fußball oder Tennis
STAAT: Land, Nation | Politisches Gebilde
STADT: Große Siedlung | Gegenteil von Dorf
STAHL: Hartes Metall | Veredeltes Eisen
STAUB: Feiner Schmutz | Wird weggewischt
STEIN: Hartes Mineral | Fels, Kiesel
STERN: Himmelskörper | Leuchtet nachts am Himmel
STIER: Männliches Rind | Sternzeichen
STIFT: Schreibgerät | Kleiner Nagel
STOFF: Gewebe, Tuch | Material
STROM: Elektrizität | Großer Fluss
STUHL: Sitzmöbel | Hat vier Beine und eine Lehne
SUPPE: Flüssige Speise | Wird mit dem Löffel gegessen
TAFEL: Schreibfläche in der Schule | Festlicher Tisch
TANNE: Nadelbaum | Weihnachtsbaum
TANTE: Schwester der Mutter | Verwandte
TASSE: Trinkgefäß mit Henkel | Gefäß für Kaffee
TEICH: Kleiner See | Stilles Gewässer
TEXT: Geschriebenes | Wortfolge
THEMA: Gegenstand eines Gesprächs | Sujet
TIGER: Gestreifte Raubkatze | Großkatze aus Asien
TISCH: Möbel mit Platte | Darauf wird gegessen
TRAUM: Erlebnis im Schlaf | Wunschvorstellung
TRUHE: Kasten mit Deckel | Alte Aufbewahrungskiste
TÜREN: Mehrzahl von Tür | Mehrere Eingänge
TULPE: Frühlingsblume | Blume aus Holland
UMWEG: Längere Strecke | Nicht der direkte Weg
VATER: Männliches Elternteil | Papa
VOGEL: Tier mit Federn | Gefiedertes Tier
WAAGE: Gerät zum Wiegen | Sternzeichen
WAGEN: Fahrzeug | Auto, Karre
WELLE: Wasserbewegung | Woge
WIESE: Grasfläche | Grünland
WOCHE: Sieben Tage | Zeitspanne von Montag bis Sonntag
WOLKE: Gebilde am Himmel | Bringt Regen
WOLLE: Haar des Schafs | Material zum Stricken
WURST: Fleischware | Kommt auf den Grill
WÜSTE: Trockenes Sandgebiet | Sahara ist eine
ZANGE: Werkzeug zum Greifen | Kneifwerkzeug
ZEBRA: Gestreiftes Tier | Pferd mit Streifen
ZIEGE: Meckerndes Haustier | Tier mit Hörnern und Bart
ZUNGE: Geschmacksorgan | Organ im Mund
ZWERG: Sehr kleiner Mensch | Märchenfigur mit Zipfelmütze
ZWEIG: Teil eines Baumes | Kleiner Ast
ÄRGER: Verdruss | Unmut
ÖFTER: Mehrmals | Häufiger
ÜBUNG: Training | Macht den Meister
BLIND: Ohne Sehvermögen | Nicht sehend
BREIT: Von großer Breite | Nicht schmal
BRAUN: Farbe der Schokolade | Farbe der Erde
BRAV: Artig | Gehorsam
DICHT: Undurchlässig | Eng beieinander
EDEL: Vornehm | Hochwertig
ERNST: Nicht spaßig | Seriös
FERN: Weit entfernt | In der Ferne
FLACH: Eben, nicht tief | Ohne Erhebung
FLINK: Schnell, wendig | Behände
FREMD: Unbekannt | Nicht vertraut
FROH: Fröhlich | Glücklich
GENAU: Exakt | Präzise
GERN: Mit Freude | Bereitwillig
GLATT: Ohne Unebenheit | Rutschig
HOHL: Innen leer | Ausgehöhlt
IRRE: Verrückt | Wahnsinnig
KLEIN: Nicht groß | Von geringer Größe
KNAPP: Gerade ausreichend | Kaum genug
KRANK: Nicht gesund | Leidend
KRUMM: Nicht gerade | Gebogen
LEISE: Nicht laut | Kaum hörbar
MAGER: Dünn, fettarm | Hager
MATT: Glanzlos | Kraftlos; Schachende
NACKT: Unbekleidet | Bloß
NÖTIG: Erforderlich | Notwendig
OFFEN: Nicht geschlossen | Ehrlich, aufrichtig
RASCH: Schnell | Zügig
REIN: Sauber | Unvermischt
RUHIG: Still, gelassen | Ohne Lärm
SANFT: Zart, mild | Weich, behutsam
SATT: Nicht hungrig | Genug gegessen
SAUER: Nicht süß | Verärgert
SCHEU: Ängstlich, zurückhaltend | Schüchtern
SCHÖN: Hübsch | Ansehnlich
STARK: Kräftig | Mächtig
STEIL: Stark ansteigend | Schroff abfallend
STILL: Ruhig, leise | Ohne Geräusch
STOLZ: Selbstbewusst | Hochmut
STUMM: Nicht sprechend | Schweigend
TEUER: Kostspielig | Nicht billig
TREU: Loyal | Zuverlässig
TRÜBE: Nicht klar | Wolkig, undurchsichtig
WEISE: Klug, erfahren | Art und …
WEICH: Nicht hart | Nachgiebig
BAUEN: Errichten | Ein Haus hochziehen
BETEN: Zu Gott sprechen | Ein Gebet sprechen
ENDEN: Aufhören | Zu Ende gehen
ERBEN: Nachlass erhalten | Vermögen bekommen
GEBEN: Überreichen | Schenken
GEHEN: Zu Fuß bewegen | Laufen, schreiten
HABEN: Besitzen | Hilfsverb
HEBEN: Nach oben bewegen | Anheben
HOLEN: Herbeibringen | Beschaffen
HÖREN: Mit den Ohren wahrnehmen | Lauschen
LADEN: Geschäft | Beladen, einpacken
LEGEN: Hinlegen | Platzieren
LEBEN: Existieren | Dasein
LOBEN: Anerkennen | Rühmen
LÜGEN: Unwahrheit sagen | Nicht die Wahrheit sagen
MALEN: Mit Farbe gestalten | Ein Bild schaffen
NÄHEN: Mit Nadel und Faden arbeiten | Kleidung herstellen
RATEN: Vermuten | Einen Rat geben
REDEN: Sprechen | Sich unterhalten
RUFEN: Laut sprechen | Schreien
RUHEN: Ausruhen | Rasten
SAGEN: Sprechen | Äußern
SEHEN: Mit den Augen wahrnehmen | Erblicken
WAGEN: Riskieren | Fahrzeug
LEGTE: Vergangenheit von „legen“ | Platzierte
SAGTE: Vergangenheit von „sagen“ | Sprach
NAHM: Vergangenheit von „nehmen“ | Griff zu
STAND: Vergangenheit von „stehen“ | Verkaufstisch; Position
BLIEB: Vergangenheit von „bleiben“ | Ging nicht weg
TRANK: Vergangenheit von „trinken“ | Nahm Flüssigkeit zu sich
STIEG: Vergangenheit von „steigen“ | Kletterte hinauf
WUCHS: Vergangenheit von „wachsen“ | Wurde größer
ALTER: Lebensjahre | Zeit des Lebens
ASIEN: Größter Kontinent | China und Indien liegen dort
BADEN: Im Wasser schwimmen | Sich in der Wanne waschen
KENIA: Land in Ostafrika | Staat mit Hauptstadt Nairobi
KAIRO: Hauptstadt Ägyptens | Stadt am Nil
NEPAL: Land im Himalaya | Staat mit dem Mount Everest
OSLO: Hauptstadt Norwegens | Norwegische Metropole
PARIS: Hauptstadt Frankreichs | Stadt mit Eiffelturm
PERU: Land in Südamerika | Land der Inka
RHEIN: Großer deutscher Fluss | Fließt durch Köln
ROM: Hauptstadt Italiens | Ewige Stadt
TIROL: Österreichisches Bundesland | Land mit Innsbruck
WIEN: Hauptstadt Österreichs | Stadt an der Donau
BERN: Hauptstadt der Schweiz | Schweizer Bundesstadt
GRAZ: Zweitgrößte Stadt Österreichs | Hauptstadt der Steiermark
LINZ: Stadt an der Donau | Hauptstadt Oberösterreichs
KÖLN: Stadt am Rhein | Dom-Stadt
ELBE: Fluss durch Hamburg | Deutscher Strom
DONAU: Fluss durch Wien | Zweitlängster Fluss Europas
NIL: Längster Fluss Afrikas | Fluss durch Ägypten
ADRIA: Teil des Mittelmeers | Meer bei Venedig
ANDEN: Gebirge in Südamerika | Längste Gebirgskette der Welt
MARS: Roter Planet | Kriegsgott der Römer
VENUS: Nachbarplanet der Erde | Göttin der Liebe
ZEUS: Oberster griechischer Gott | Göttervater
THOR: Germanischer Donnergott | Gott mit dem Hammer
ODIN: Oberster germanischer Gott | Göttervater der Wikinger
ABFALL: Müll | Unrat
ABITUR: Reifeprüfung | Schulabschluss vor dem Studium
ABLAUF: Verlauf | Reihenfolge der Ereignisse
ABSATZ: Teil des Schuhs | Textabschnitt
ABWEHR: Verteidigung | Hintere Mannschaftsreihe
ACHSEL: Schulterhöhle | Körperstelle unter dem Arm
ADRESSE: Wohnanschrift | Straße und Hausnummer
AKTION: Handlung | Sonderangebot
ANFANG: Beginn | Start
ANGEBOT: Offerte | Preisnachlass im Laden
ANKUNFT: Eintreffen | Gegenteil von Abfahrt
ANTWORT: Erwiderung | Reaktion auf eine Frage
ANWALT: Rechtsbeistand | Jurist vor Gericht
ARBEIT: Tätigkeit, Beruf | Mühe, Plage
ÄRMEL: Teil der Jacke | Umhüllt den Arm
ATHLET: Sportler | Durchtrainierter Wettkämpfer
AUFZUG: Fahrstuhl | Lift
AUGUST: Achter Monat | Sommermonat
AUSWEIS: Dokument zur Identifikation | Pass oder Personalausweis
BÄCKER: Stellt Brot her | Handwerker für Brötchen
BALKON: Vorbau am Haus | Austritt an der Wohnung
BANANE: Gelbe krumme Frucht | Affenlieblingsobst
BEFEHL: Anordnung | Kommando
BEGINN: Anfang | Start
BERUF: Tätigkeit zum Geldverdienen | Job, Profession
BESUCH: Gast | Visite
BIBER: Nagetier am Wasser | Baumeister von Dämmen
BLUMEN: Mehrzahl von Blume | Strauß besteht daraus
BRILLE: Sehhilfe | Gläser auf der Nase
BRÜCKE: Bauwerk über den Fluss | Verbindung zweier Ufer
BRUDER: Männliches Geschwister | Sohn der Eltern
BUTTER: Streichfett | Fett aus Milch
BÜCHER: Mehrzahl von Buch | Lesestoff in der Bibliothek
DIENER: Bediensteter | Lakai
DOKTOR: Arzt | Akademischer Titel
DONNER: Geräusch beim Gewitter | Folgt dem Blitz
DRACHE: Fabelwesen mit Flügeln | Feuerspeiendes Ungeheuer
DURCH: Hindurch | Mittels
ELTERN: Vater und Mutter | Erziehungsberechtigte
ENERGIE: Kraft, Tatkraft | Strom, Antriebskraft
ERFOLG: Gelingen | Positives Ergebnis
ESSIG: Saure Flüssigkeit | Säure zum Salat
EUROPA: Unser Kontinent | Erdteil mit Deutschland
FABRIK: Produktionsstätte | Werk mit Maschinen
FAHRER: Lenker eines Fahrzeugs | Chauffeur
FAMILIE: Eltern und Kinder | Verwandtschaft
FEHLER: Irrtum | Mangel, Versehen
FENSTER: Lichtöffnung in der Wand | Glasscheibe im Haus
FERIEN: Schulfreie Zeit | Urlaub
FIEBER: Erhöhte Körpertemperatur | Krankheitszeichen
FINGER: Teil der Hand | Daumen ist einer
FLASCHE: Behälter für Getränke | Gefäß mit Hals
FLEISCH: Nahrung vom Tier | Muskelgewebe
FLIEGE: Summendes Insekt | Querbinder zum Anzug
FREUDE: Fröhlichkeit | Glücksgefühl
FREUND: Vertrauter | Kumpel, Kamerad
FRIEDEN: Zustand ohne Krieg | Harmonie, Eintracht
FRISCH: Neu, nicht alt | Kühl, erfrischend
FRUCHT: Obst | Ertrag der Pflanze
GARTEN: Grünfläche am Haus | Ort für Blumen und Gemüse
GEBURT: Beginn des Lebens | Niederkunft
GEDANKE: Einfall | Überlegung
GEFAHR: Bedrohung | Risiko
GEFÜHL: Emotion | Empfindung
GEHIRN: Denkorgan | Organ im Kopf
GEMÜSE: Karotten, Kohl und Co. | Pflanzliche Nahrung
GESETZ: Rechtsvorschrift | Rechtliche Regel
GEWINN: Profit | Ertrag
GIPFEL: Bergspitze | Höchster Punkt
GITARRE: Saiteninstrument | Instrument mit sechs Saiten
GLAUBE: Religiöse Überzeugung | Vertrauen
GRENZE: Trennlinie zwischen Ländern | Schranke, Limit
GRUPPE: Mehrere Personen | Team, Schar
HAMMER: Werkzeug zum Schlagen | Damit schlägt man Nägel ein
HANDEL: Kauf und Verkauf | Geschäftsverkehr
HAUFEN: Aufgetürmte Menge | Stapel
HEIMAT: Herkunftsort | Ort, wo man zu Hause ist
HEIZUNG: Wärmeanlage | Macht das Zimmer warm
HELFER: Unterstützer | Assistent
HERBST: Jahreszeit nach dem Sommer | Zeit des Laubfalls
HIMMEL: Firmament | Wolken sind dort
HIRSCH: Waldtier mit Geweih | Großes Wildtier
HONIG: Süßes Bienenprodukt | Brotaufstrich von der Biene
HUNGER: Verlangen nach Essen | Nahrungsmangel
INSEKT: Kerbtier | Tier mit sechs Beinen
JANUAR: Erster Monat | Wintermonat
KAFFEE: Heißgetränk aus Bohnen | Wachmacher am Morgen
KAISER: Höchster Herrscher | Monarch über dem König
KAMERA: Fotoapparat | Gerät für Aufnahmen
KANONE: Großes Geschütz | Kriegswaffe mit Kugeln
KARTON: Pappschachtel | Verpackung aus Pappe
KELLER: Raum unter dem Haus | Untergeschoss
KIRCHE: Gotteshaus | Gebäude mit Turm und Glocke
KIRSCHE: Rote Steinfrucht | Obst mit Kern
KLASSE: Schulgruppe | Güteklasse
KLINGE: Schneidender Teil des Messers | Schneide
KNOCHEN: Teil des Skeletts | Gebein
KÖRPER: Leib | Physis
KOSTEN: Ausgaben | Preis; probieren
KUCHEN: Süßes Gebäck | Torte
KUNDE: Käufer | Klient
LEHRER: Unterrichtender | Pädagoge in der Schule
LEITER: Steighilfe mit Sprossen | Chef, Vorgesetzter
LÖFFEL: Essbesteck für Suppe | Besteckteil
MANTEL: Wintermantel | Oberbekleidung für die Kälte
MARKT: Handelsplatz | Verkaufsstände auf dem Platz
MAUERN: Mehrzahl von Mauer | Steinwände
MEDIZIN: Arznei | Heilkunde
MENSCH: Homo sapiens | Person
MESSER: Schneidewerkzeug | Besteck mit Klinge
METALL: Eisen, Gold oder Silber | Werkstoff, der glänzt
MINUTE: Sechzig Sekunden | Zeiteinheit
MITTAG: Tagesmitte | Zwölf Uhr
MONTAG: Erster Wochentag | Tag nach Sonntag
MÖRDER: Täter eines Mordes | Verbrecher
MUSKEL: Kraftspender im Körper | Fleischstrang
MUTTER: Weiblicher Elternteil | Mama
NACHBAR: Anwohner nebenan | Wer nebenan wohnt
NATION: Volk, Staat | Land
NORDEN: Himmelsrichtung | Richtung zum Pol
NUMMER: Zahl | Ziffernfolge
ORANGE: Zitrusfrucht | Farbe zwischen Rot und Gelb
PAPIER: Beschreibbares Material | Blatt zum Schreiben
PERSON: Mensch | Individuum
PFEIFE: Rauchgerät | Instrument des Schiedsrichters
PFLANZE: Gewächs | Blume oder Baum
PFLICHT: Verpflichtung | Was man tun muss
PLANET: Himmelskörper | Erde oder Mars
POLIZEI: Ordnungshüter | Gesetzeshüter
PRINZ: Königssohn | Fürstensohn
QUELLE: Ursprung eines Flusses | Herkunft von Informationen
RAHMEN: Umrandung eines Bildes | Einfassung
RAKETE: Flugkörper ins All | Feuerwerkskörper
RÄTSEL: Knobelaufgabe | Geheimnis
REGION: Gebiet | Landstrich
RICHTER: Vorsitzender im Gericht | Spricht das Urteil
RITTER: Kämpfer im Mittelalter | Mann in Rüstung
RÜCKEN: Hinterseite des Körpers | Körperteil mit Wirbelsäule
SALBE: Heilcreme | Wird auf die Haut aufgetragen
SCHIFF: Großes Wasserfahrzeug | Fährt auf dem Meer
SCHULE: Lehranstalt | Ort des Unterrichts
SCHUTZ: Sicherheit | Abschirmung
SCHWEIN: Borstentier | Nutztier, liefert Schnitzel
SEKUNDE: Sechzigstel einer Minute | Kleine Zeiteinheit
SESSEL: Bequemer Polsterstuhl | Sitzmöbel mit Lehnen
SILBER: Edelmetall | Zweiter Platz
SOLDAT: Angehöriger der Armee | Kämpfer in Uniform
SOMMER: Warme Jahreszeit | Zeit der Ferien
SPIEGEL: Reflektierende Fläche | Zeigt das eigene Bild
SPINNE: Achtbeiniges Tier | Netzbauerin
SPRACHE: Mittel der Verständigung | Deutsch oder Englisch
STIEFEL: Hoher Schuh | Schuh für Regen und Schnee
STRAND: Sandufer am Meer | Ort zum Sonnenbaden
STREIT: Auseinandersetzung | Zank
STUNDE: Sechzig Minuten | Zeiteinheit
SUCHE: Nachforschung | Fahndung
SÜDEN: Himmelsrichtung | Wo die Sonne mittags steht
TASCHE: Behältnis zum Tragen | Beutel an der Hose
TEUFEL: Satan | Böser Geist
THEATER: Schauspielhaus | Bühnenkunst
TOMATE: Rotes Gemüse | Paradeiser
TRÄNEN: Flüssigkeit beim Weinen | Tropfen aus den Augen
TUNNEL: Unterirdischer Durchgang | Röhre durch den Berg
UNFALL: Missgeschick | Zusammenstoß im Verkehr
URLAUB: Ferien | Freie Zeit zum Erholen
VERTRAG: Abkommen | Kontrakt
WAFFE: Kampfgerät | Pistole oder Schwert
WASSER: Lebenswichtige Flüssigkeit | Fließt aus dem Hahn
WECKER: Uhr zum Aufwachen | Klingelt am Morgen
WESTEN: Himmelsrichtung | Dort geht die Sonne unter
WETTER: Sonne, Regen, Wind | Meteorologisches Geschehen
WINTER: Kalte Jahreszeit | Zeit des Schnees
WIRBEL: Teil der Rückensäule | Strudel
WOLKEN: Mehrzahl von Wolke | Weiße Gebilde am Himmel
WUNDER: Unerklärliches Ereignis | Mirakel
WÜRFEL: Spielgerät mit sechs Seiten | Kubus
ZAHLEN: Mehrzahl von Zahl | Bezahlen
ZEITUNG: Tägliches Druckwerk | Nachrichtenblatt
ZIMMER: Raum in der Wohnung | Stube
ZITRONE: Saure gelbe Frucht | Zitrusfrucht
ZUCKER: Süßungsmittel | Süßer Stoff
ZUFALL: Unerwartetes Ereignis | Fügung
ZUKUNFT: Kommende Zeit | Was noch kommt
ZWIEBEL: Scharfes Küchengemüse | Bringt zum Weinen beim Schneiden
ÄRZTIN: Weibliche Medizinerin | Doktorin
ABENTEUER: Aufregendes Erlebnis | Wagnis
ABSCHIED: Trennung | Lebewohl
ABSICHT: Vorsatz | Plan, Vorhaben
ABSTAND: Entfernung | Distanz
ACHTUNG: Respekt | Vorsicht!
ANGRIFF: Attacke | Offensive
ANLAGE: Einrichtung | Investition
ANSICHT: Meinung | Blick auf etwas
ANTRAG: Gesuch | Heiratsvorschlag
APOTHEKE: Arzneiverkaufsstelle | Dort kauft man Medikamente
APRIL: Vierter Monat | Monat der Scherze
ARTIKEL: Zeitungsbeitrag | Begleiter des Hauptworts
AUFGABE: Pflicht, Arbeit | Rechenbeispiel
AUFTRAG: Bestellung | Mission
AUSLAND: Fremdes Land | Nicht die Heimat
AUSSAGE: Behauptung | Zeugenbericht
AUSSICHT: Blick in die Weite | Perspektive
BAHNHOF: Haltestelle der Züge | Dort fährt der Zug ab
BAUSTEIN: Element zum Bauen | Spielzeug für Kinder
BEDEUTUNG: Sinn | Wichtigkeit
BEISPIEL: Muster, Vorbild | Exempel
BERICHT: Schriftliche Darstellung | Reportage
BESITZER: Eigentümer | Inhaber
BETRIEB: Firma | Unternehmen
BEWEGUNG: Ortsveränderung | Gegenteil von Stillstand
BLEISTIFT: Schreibgerät aus Holz | Stift mit Graphitmine
BÜCHEREI: Bibliothek | Ort zum Bücherausleihen
CHEMIE: Lehre von den Stoffen | Naturwissenschaft
COMPUTER: Rechner | Elektronische Rechenmaschine
DEZEMBER: Zwölfter Monat | Weihnachtsmonat
DIAMANT: Wertvollster Edelstein | Härtester Stoff
DIENSTAG: Zweiter Wochentag | Tag nach Montag
DIREKTOR: Leiter einer Schule | Chef, Vorstand
DREIECK: Figur mit drei Ecken | Geometrische Form
DRUCKER: Gerät zum Ausdrucken | Peripheriegerät am Computer
EHEFRAU: Gattin | Verheiratete Frau
EHEMANN: Gatte | Verheirateter Mann
EINHEIT: Ganzheit | Maß wie Meter oder Liter
EINKAUF: Besorgung | Shopping
EISBERG: Schwimmendes Eis | Brachte die Titanic zum Sinken
ELEFANT: Dickhäuter mit Rüssel | Größtes Landtier
ERDBEERE: Rote Sommerfrucht | Süßes Obst mit Kernen außen
EREIGNIS: Geschehen | Vorkommnis
ERGEBNIS: Resultat | Ausgang
ERKLÄRUNG: Erläuterung | Begründung
ERLEBNIS: Erfahrung | Abenteuer
FAHRRAD: Zweirad mit Pedalen | Velo
FAHRZEUG: Vehikel | Auto oder Lkw
FEBRUAR: Zweiter Monat | Kürzester Monat
FEIERTAG: Arbeitsfreier Tag | Festtag
FERNSEHER: Gerät mit Bildschirm | Glotze
FESTUNG: Wehranlage | Bollwerk
FEUERWEHR: Löscht Brände | Kommt mit Sirene und Leiter
FLUGZEUG: Maschine zum Fliegen | Flieger
FLÜGEL: Teil des Vogels | Konzertklavier
FORSCHER: Wissenschaftler | Entdecker
FOTOGRAF: Lichtbildner | Macht Aufnahmen
FREIHEIT: Unabhängigkeit | Gegenteil von Gefangenschaft
FREITAG: Fünfter Wochentag | Tag vor dem Wochenende
FREUNDIN: Vertraute | Partnerin
FRISEUR: Haarschneider | Kümmert sich um die Frisur
FRÜHLING: Jahreszeit nach dem Winter | Zeit des Erblühens
GARDINE: Fenstervorhang | Stoff vor dem Fenster
GEBÄUDE: Bauwerk | Haus
GEBIRGE: Bergkette | Viele Berge
GEDICHT: Lyrisches Werk | Verse, Poem
GEFÄNGNIS: Haftanstalt | Knast
GEGEND: Gebiet, Landstrich | Umgebung
GEHEIMNIS: Verborgenes | Was keiner wissen soll
GEMEINDE: Kleinste Verwaltungseinheit | Kommune
GERICHT: Justizbehörde | Speise, Mahlzeit
GESCHENK: Gabe | Präsent
GESICHT: Vorderseite des Kopfes | Antlitz
GESPRÄCH: Unterhaltung | Dialog
GEWITTER: Unwetter mit Blitz und Donner | Sturm mit Entladungen
GIRAFFE: Tier mit langem Hals | Höchstes Landtier
GLOCKE: Klangkörper im Kirchturm | Läutet zur Messe
HAUSTIER: Hund oder Katze | Tier in der Wohnung
HEIMWEH: Sehnsucht nach Zuhause | Verlangen nach der Heimat
HERZOG: Adelstitel | Hoher Adliger
HIMBEERE: Rote Beere | Frucht vom Strauch
HOCHZEIT: Trauung | Vermählung
HOFFNUNG: Zuversicht | Erwartung von Gutem
INTERNET: Weltweites Netz | Online-Welt
KALENDER: Übersicht der Tage | Zeigt Datum und Monat
KAPITÄN: Führer eines Schiffes | Mannschaftsführer
KARTOFFEL: Erdapfel | Knolle für Pommes
KINDHEIT: Frühe Lebensphase | Zeit vor dem Erwachsensein
KLAVIER: Tasteninstrument | Piano
KLEIDUNG: Bekleidung | Garderobe
KOLLEGE: Mitarbeiter | Arbeitskamerad
KÖNIGIN: Herrscherin | Frau des Königs
KONZERT: Musikaufführung | Musikveranstaltung
KRANKHEIT: Leiden | Erkrankung
KRÄUTER: Würzpflanzen | Petersilie und Basilikum
KREISEL: Spielzeug, das sich dreht | Kreisverkehr (umgangssprachlich)
KÜNSTLER: Kreativer Schaffender | Maler oder Musiker
LACHEN: Fröhlich sein | Ausdruck der Freude
LANDKARTE: Darstellung der Erde | Hilfe bei der Orientierung
LAUFEN: Rennen | Gehen
LEHRERIN: Pädagogin | Unterrichtende
LEITUNG: Führung | Rohr oder Kabel
LEKTION: Unterrichtseinheit | Lehre, Lehrstunde
LIBELLE: Insekt am Teich | Fluginsekt mit vier Flügeln
LÖSUNG: Antwort auf ein Rätsel | Ergebnis
MASCHINE: Technisches Gerät | Apparat
MATROSE: Seemann | Schiffsbesatzung
MEINUNG: Ansicht | Standpunkt
MEISTER: Experte im Handwerk | Gewinner eines Turniers
MELODIE: Tonfolge | Weise eines Liedes
MINISTER: Regierungsmitglied | Leiter eines Ministeriums
MITTWOCH: Dritter Wochentag | Mitte der Woche
MONSTER: Ungeheuer | Schreckliches Wesen
MOTORRAD: Zweirad mit Motor | Maschine für Biker
MUSEUM: Ausstellungshaus | Ort für Kunst und Geschichte
NACHRICHT: Mitteilung | Botschaft
NATUR: Umwelt | Pflanzen, Tiere und Landschaft
NOVEMBER: Elfter Monat | Nebelmonat
OKTOBER: Zehnter Monat | Herbstmonat
ORDNUNG: Geregelter Zustand | Gegenteil von Chaos
PAPAGEI: Bunter sprechender Vogel | Tropenvogel
PARADIES: Garten Eden | Ort der Seligen
PARTNER: Gefährte | Geschäftsteilhaber
PATIENT: Kranker beim Arzt | Behandelter
PFARRER: Geistlicher | Seelsorger
PINGUIN: Flugunfähiger Vogel | Vogel im Frack
PISTOLE: Handfeuerwaffe | Kleine Schusswaffe
POLITIK: Staatskunst | Regierungsgeschäft
PROBLEM: Schwierigkeit | Ungelöste Aufgabe
PROGRAMM: Ablaufplan | Software
PROZENT: Hundertstel | Anteil von hundert
PRÜFUNG: Examen | Test
PYRAMIDE: Bauwerk der Pharaonen | Spitzes Grabmal in Ägypten
QUADRAT: Viereck mit gleichen Seiten | Geometrische Form
RECHNUNG: Zahlungsaufforderung | Rechenaufgabe
REGIERUNG: Staatsführung | Kabinett
RELIGION: Glaube | Konfession
RICHTUNG: Kurs | Orientierung
SAMSTAG: Sechster Wochentag | Tag vor dem Sonntag
SCHATTEN: Dunkler Bereich ohne Sonne | Lichtloser Umriss
SCHLANGE: Kriechendes Reptil | Warteschlange
SCHLOSS: Prunkvolles Gebäude | Vorrichtung an der Tür
SCHLÜSSEL: Öffnet das Schloss | Hängt am Bund
SCHMERZ: Pein | Körperliches Leid
SCHNECKE: Kriechtier mit Haus | Langsames Tier
SCHRANK: Möbel mit Türen | Kasten für Kleidung
SCHULTER: Körperteil über dem Arm | Trägt den Rucksack
SCHWESTER: Weibliches Geschwister | Krankenpflegerin
SEPTEMBER: Neunter Monat | Monat des Schulbeginns
SIEDLUNG: Wohngebiet | Ansammlung von Häusern
SOLDATEN: Mehrzahl von Soldat | Mitglieder der Armee
SONNTAG: Letzter Wochentag | Ruhetag
SPIELER: Teilnehmer am Spiel | Fußballer
SPIELZEUG: Puppe oder Bausteine | Sachen für Kinder
STATION: Haltestelle | Abteilung im Krankenhaus
STIMMUNG: Laune | Atmosphäre
STRASSE: Fahrweg | Verkehrsweg in der Stadt
STUDENT: Lernender an der Universität | Hochschüler
TAGEBUCH: Private Aufzeichnungen | Buch für Gedanken des Tages
TATSACHE: Wahrheit | Faktum
TECHNIK: Ingenieurwissen | Verfahren, Methode
TEENAGER: Jugendlicher | Junger Mensch zwischen 13 und 19
TELEFON: Fernsprecher | Gerät zum Anrufen
TERMIN: Verabredeter Zeitpunkt | Vereinbarung
THERAPIE: Heilbehandlung | Kur
TOCHTER: Weibliches Kind | Nachkomme
TOILETTE: Klo | WC
TRAINING: Übung | Vorbereitung im Sport
TROMPETE: Blechblasinstrument | Blasinstrument mit Ventilen
TROPFEN: Kleine Flüssigkeitsmenge | Regen fällt in solchen
URSACHE: Grund | Auslöser
VERKAUF: Veräußerung | Gegenteil von Einkauf
VERLUST: Einbuße | Gegenteil von Gewinn
VERSUCH: Experiment | Probe, Test
VORTEIL: Nutzen | Plus
VORSICHT: Achtsamkeit | Behutsamkeit
WAHRHEIT: Gegenteil von Lüge | Was wirklich ist
WERKZEUG: Hammer, Zange und Co. | Hilfsmittel für Handwerker
WOHNUNG: Wohnräume | Zuhause im Mietshaus
ZEICHEN: Symbol | Signal
ZEUGNIS: Schulbewertung | Urkunde über Leistungen
ZUHAUSE: Heim | Eigene Wohnung
ZUSCHAUER: Betrachter | Publikum
ZWEIFEL: Unsicherheit | Skepsis
ZWILLING: Gleichzeitig Geborener | Sternzeichen
ANANAS: Tropische Frucht | Südfrucht mit Schuppen
BUCHSTABE: Zeichen des Alphabets | A, B oder C
DELPHIN: Kluges Meeressäugetier | Springt aus dem Wasser
GEWICHT: Schwere | Masse in Kilogramm
KÄNGURU: Beuteltier aus Australien | Hüpfendes Tier
KROKODIL: Panzerechse | Reptil mit großem Maul
LAWINE: Schneerutsch | Abgehende Schneemasse
MARMOR: Edler Stein | Material für Statuen
NASHORN: Dickhäuter mit Horn | Rhinozeros
PFLAUME: Blaues Steinobst | Zwetschke
SCHNEE: Weißer Niederschlag | Fällt im Winter
SCHWAMM: Saugendes Putzmittel | Meerestier
SPARGEL: Frühlingsgemüse | Weiße Stangen
STRAUSS: Blumenbündel | Großer Laufvogel
VULKAN: Feuerspeiender Berg | Berg mit Lava
ZIRKUS: Zeltvorstellung mit Artisten | Manege und Clowns
ABBILD: Darstellung | Kopie, Ebenbild
ABGABE: Steuer | Einreichung
ABHANG: Bergseite | Schräge Fläche
ABSAGE: Negative Antwort | Ablehnung
ABSTIEG: Weg nach unten | Gegenteil von Aufstieg
ABTEIL: Raum im Zugwaggon | Kabine im Zug
ADVENT: Zeit vor Weihnachten | Vier Sonntage vor dem Fest
AFRIKA: Kontinent südlich von Europa | Erdteil mit der Sahara
AKZENT: Sprachfärbung | Betonungszeichen
ALTAR: Tisch in der Kirche | Opferstätte
AMEISE: Fleißiges Insekt | Kleines Tier im Hügel
ANGLER: Fischer mit Rute | Jemand, der Fische fängt
ANLASS: Grund, Gelegenheit | Veranlassung
ANRUF: Telefonat | Gespräch am Telefon
ANTEIL: Teil vom Ganzen | Portion
ANTIKE: Altertum | Zeit der Griechen und Römer
ANZAHL: Menge | Zahl der Stücke
ARCHIV: Sammlung alter Dokumente | Aufbewahrungsort für Akten
ASIATE: Bewohner Asiens | Mensch aus China oder Japan
ATEMZUG: Einmal Luftholen | Hauch
AUFBAU: Errichtung | Struktur
AUFSATZ: Schulischer Schreibtext | Abhandlung
AUSFLUG: Kurze Reise | Tour ins Grüne
AUSGANG: Weg nach draußen | Ende, Resultat
AUSREDE: Vorgeschobener Grund | Entschuldigung, die nicht stimmt
BACKOFEN: Gerät zum Backen | Teil des Herds
BÄCKEREI: Brotgeschäft | Laden mit Semmeln und Kuchen
BAGGER: Baumaschine | Fahrzeug mit Schaufel
BALLETT: Bühnentanz | Tanz in Spitzenschuhen
BANKIER: Bankfachmann | Geldverleiher
BAUHERR: Auftraggeber eines Baus | Lässt ein Haus errichten
BAUMARKT: Geschäft für Heimwerker | Laden für Werkzeug und Holz
BEAMTER: Staatsdiener | Angestellter des Staates
BEDARF: Benötigte Menge | Nachfrage
BEGRIFF: Wort, Terminus | Vorstellung
BEIFALL: Applaus | Klatschen
BENZIN: Kraftstoff | Treibstoff fürs Auto
BERATER: Ratgeber | Konsulent
BERGBAU: Abbau von Rohstoffen | Arbeit im Stollen
BESTECK: Messer, Gabel, Löffel | Essgerät
BETRAG: Geldsumme | Summe
BEWEIS: Nachweis | Beleg
BILDUNG: Wissen, Erziehung | Ausbildung
BISCHOF: Hoher Geistlicher | Leiter einer Diözese
BLÜTE: Farbiger Teil der Pflanze | Falschgeld (umgangssprachlich)
BRANCHE: Wirtschaftszweig | Geschäftsbereich
BRATEN: Fleisch aus dem Ofen | In der Pfanne garen
BREMSE: Vorrichtung zum Anhalten | Stechendes Insekt
BRETT: Flaches Holzstück | Planke
BRUNNEN: Wasserstelle | Quelle im Dorf
BÜRGER: Einwohner | Staatsangehöriger
BUDGET: Finanzplan | Haushaltsplan
DAUMEN: Dickster Finger | Finger zum Hochhalten
DENKER: Philosoph | Grübler
DESSERT: Nachspeise | Süßes nach dem Essen
DICHTER: Verfasser von Gedichten | Poet
DIESEL: Kraftstoff für Lkw | Treibstoffart
DIREKT: Unmittelbar | Geradewegs
DOPPEL: Zweifach | Tennis zu viert
DRAMA: Schauspiel | Trauerspiel
DÜNGER: Mittel für Pflanzenwachstum | Nahrung für den Boden
DUSCHE: Brause im Bad | Wasserstrahl zum Waschen
EICHE: Laubbaum mit Eicheln | Baum mit hartem Holz
EIDECHSE: Kleines Reptil | Flinke Echse auf Steinen
EIGELB: Gelbes im Ei | Dotter
EINBRUCH: Diebstahl in Wohnung | Unerlaubtes Eindringen
EINDRUCK: Wirkung | Impression
EINFALL: Idee | Plötzlicher Gedanke
EINGANG: Zugang | Tür hinein
EINWAND: Gegenargument | Protest
EISBÄR: Weißes Raubtier der Arktis | Polarbär
EMPFANG: Rezeption | Begrüßung
ENTWURF: Skizze | Konzept
ERDTEIL: Kontinent | Afrika oder Asien
ERFINDER: Schöpfer von Neuem | Edison war einer
ERSATZ: Austausch | Vertretung
EXPERTE: Fachmann | Kenner
FACHMANN: Experte | Spezialist
FÄHRE: Schiff zum Übersetzen | Transportboot über den Fluss
FAKTOR: Einflussgröße | Zahl beim Multiplizieren
FASAN: Hühnervogel mit buntem Gefieder | Jagdvogel
FASSADE: Vorderseite des Hauses | Äußere Erscheinung
FAULHEIT: Trägheit | Arbeitsscheu
FEDERN: Mehrzahl von Feder | Vogelkleid
FEIERN: Ein Fest begehen | Party machen
FELSEN: Großer Stein | Gesteinsbrocken
FESSEL: Band zum Binden | Gelenk des Pferdes
FICHTE: Nadelbaum | Häufiger Waldbaum
FIGUR: Gestalt, Form | Spielstein
FILTER: Sieb | Reinigt Wasser oder Luft
FLAMME: Brennendes Feuer | Teil des Feuers
FLIESE: Kachel | Wand- oder Bodenplatte
FLOCKE: Kleines Teilchen | Schnee fällt in solchen
FLÜSSIG: Nicht fest | Fließend
FOLGE: Konsequenz | Episode einer Serie
FORELLE: Süßwasserfisch | Speisefisch aus dem Bach
FORMEL: Rechenregel | Mathematischer Ausdruck
FRACHT: Transportgut | Ladung
FRIEDHOF: Begräbnisstätte | Ort der Gräber
FRISUR: Haartracht | Haarschnitt
FUNKEN: Glühende Teilchen | Kleine Feuerpunkte
GALERIE: Kunstausstellung | Raum für Bilder
GARAGE: Unterstand für Autos | Autounterkunft
GASTHAUS: Wirtshaus | Lokal mit Küche
GEBÄCK: Kekse und Kuchen | Backwaren
GEBIET: Region | Bereich
GEDULD: Ausdauer, Ruhe | Gegenteil von Ungeduld
GEHALT: Monatslohn | Inhalt, Substanz
GELÄNDE: Terrain | Landstück
GEMÄLDE: Kunstwerk mit Farben | Bild eines Malers
GEMÜT: Seelenverfassung | Innere Stimmung
GENUSS: Freude am Guten | Vergnügen
GERÄUSCH: Laut | Was man hört
GESANG: Singen | Vokalmusik
GESELLE: Handwerker nach der Lehre | Vorstufe zum Meister
GESTALT: Figur, Form | Erscheinung
GETREIDE: Weizen, Roggen, Hafer | Korn
GEWEBE: Stoff | Textil
GEWEIH: Kopfschmuck des Hirsches | Stangen am Hirschkopf
GEWÜRZ: Würzmittel | Pfeffer oder Zimt
GLÜHEN: Rot leuchten vor Hitze | Heiß strahlen
GRAFIK: Zeichnung | Bildliche Darstellung
GRANIT: Hartes Gestein | Stein für Bordsteine
GRAVUR: Eingeritzte Verzierung | Eingeschnittene Schrift
GUMMI: Elastisches Material | Kautschukprodukt
HAFER: Getreideart | Pferdefutter
HANDTUCH: Trockentuch | Textil fürs Bad
HARFE: Zupfinstrument | Instrument der Engel
HECHT: Raubfisch im See | Fisch mit spitzem Maul
HEIRAT: Eheschließung | Vermählung
HEKTAR: Flächenmaß | 10 000 Quadratmeter
HERDE: Gruppe von Tieren | Schafe im Verbund
HILFE: Unterstützung | Beistand
HOLZ: Material der Bäume | Brennmaterial
HUMMEL: Pelziges Insekt | Dicke Verwandte der Biene
HÜTTE: Einfaches Haus | Unterkunft in den Bergen
IMPULS: Anstoß | Antrieb
INHALT: Was drin ist | Gegenteil von Form
INSTINKT: Angeborener Trieb | Gespür
IRRTUM: Fehler | Fehlannahme
JUBEL: Lauter Freudenausbruch | Freudengeschrei
JUWEL: Edelstein | Kostbarkeit
KABINE: Kleiner Raum | Umkleide
KAKAO: Schokoladengetränk | Grundstoff der Schokolade
KANAL: Künstlicher Wasserweg | Fernsehsender
KANTE: Rand | Scharfer Abschluss
KANTINE: Betriebsküche | Essensraum in der Firma
KANZLER: Regierungschef | Höchstes Regierungsamt
KAPELLE: Kleine Kirche | Musikgruppe
KAPITEL: Abschnitt eines Buches | Buchteil
KASSE: Zahlstelle | Geldlade
KASTEN: Kiste, Behälter | Schrank (süddeutsch)
KETCHUP: Tomatensauce | Rote Würzsauce zu Pommes
KIESEL: Kleiner runder Stein | Glatter Stein am Fluss
KLIMA: Durchschnittliches Wetter | Atmosphäre
KLINIK: Krankenhaus | Spital
KNÖDEL: Runde Teigspeise | Kloß
KNOTEN: Verschlungene Schnur | Geschwindigkeitsmaß auf See
KOFFER: Reisegepäck | Behälter für die Reise
KOMPASS: Richtungsweiser | Zeigt nach Norden
KONTO: Bankverbindung | Guthaben bei der Bank
KOSMOS: Weltall | Universum
KRAWATTE: Schlips | Binder zum Hemd
KREBS: Schalentier | Sternzeichen
KUNST: Malerei, Musik, Theater | Schöpferisches Werk
KÜRBIS: Großes Herbstgemüse | Orange Frucht zu Halloween
LADUNG: Fracht | Elektrische Menge
LAGUNE: Flache Meeresbucht | Von Riff geschützte Bucht
LANDUNG: Aufsetzen des Flugzeugs | Ankunft am Boden
LATERNE: Straßenleuchte | Licht am Umzug
LAUBE: Gartenhäuschen | Kleine Hütte im Garten
LEHM: Tonhaltige Erde | Baustoff für Ziegel
LEINWAND: Kinofläche | Malgrund des Künstlers
LEUCHTE: Lampe | Lichtquelle
LINSE: Hülsenfrucht | Teil des Auges
LOKAL: Gaststätte | Örtlich
LORBEER: Gewürzblatt | Kranz des Siegers
LÜCKE: Leerstelle | Zwischenraum
MAGIE: Zauberei | Hexenkunst
MANGEL: Fehlen von etwas | Knappheit
MARKE: Handelsname | Brief…
MASSAGE: Knetbehandlung | Entspannung durch Druck
MATRATZE: Unterlage im Bett | Polster zum Schlafen
MELONE: Große Sommerfrucht | Wasser… oder Honig…
MENGE: Große Anzahl | Masse
MERKMAL: Kennzeichen | Eigenschaft
MISCHUNG: Gemisch | Kombination
MÖBEL: Tisch, Stuhl und Schrank | Einrichtungsgegenstände
MÖHRE: Karotte | Orange Wurzel
MOTIV: Beweggrund | Thema eines Bildes
MÜNZE: Geldstück | Metallgeld
MUSTER: Vorlage | Dekor, Design
NABEL: Narbe am Bauch | Mitte des Bauches
NACHBARN: Mehrzahl von Nachbar | Leute von nebenan
NAHRUNG: Essen | Lebensmittel
NARBE: Spur einer Wunde | Verheilte Verletzung
NERVEN: Reizleitungen im Körper | Verlieren bei Stress
NICHTE: Tochter des Bruders | Kind der Schwester
NIVEAU: Höhe, Stand | Qualitätsstufe
NOTIZ: Kurze Aufzeichnung | Vermerk
NUDELN: Mehrzahl von Nudel | Pasta
OBJEKT: Gegenstand | Satzergänzung
OLIVE: Frucht des Ölbaums | Grüne oder schwarze Frucht
OZEAN: Weltmeer | Riesiges Meer
PACKUNG: Verpackung | Schachtel
PALAST: Prachtbau | Prunkvolles Gebäude
PANNE: Defekt am Auto | Missgeschick
PASTA: Nudelgericht | Teigwaren
PEDAL: Fußhebel am Fahrrad | Tretteil
PFEIL: Geschoss des Bogens | Richtungszeichen
PFOTE: Tierfuß | Fuß der Katze
PINSEL: Malwerkzeug | Gerät mit Borsten
PIRAT: Seeräuber | Freibeuter
PLAKAT: Großes Werbeschild | Poster
PLANUNG: Vorbereitung | Konzeption
POKAL: Siegestrophäe | Großer Trinkbecher
PORTION: Essensmenge | Teil für eine Person
PRÄMIE: Belohnung | Bonus
PUDEL: Hunderasse mit Locken | Lockiger Hund
PULVER: Feines Granulat | Staubförmiger Stoff
QUALLE: Glibberiges Meerestier | Meerestier ohne Knochen
QUARK: Milchprodukt | Topfen
RADIO: Rundfunkgerät | Gerät zum Musikhören
RASEN: Gepflegtes Gras | Grünfläche
RECHT: Gesetz | Nicht links
REGISTER: Verzeichnis | Liste
REIFEN: Gummiteil am Rad | Pneu
REISEN: Unterwegs sein | In Urlaub fahren
RENNEN: Schnell laufen | Wettlauf
REZEPT: Kochanleitung | Verordnung vom Arzt
RINDER: Mehrzahl von Rind | Kühe und Stiere
ROBOTER: Maschinenmensch | Automat
RÜSSEL: Nase des Elefanten | Langes Riechorgan
SÄBEL: Krumme Hiebwaffe | Schwert mit gebogener Klinge
SAISON: Jahreszeit | Spielzeit im Sport
SATTEL: Sitz auf dem Pferd | Sitz am Fahrrad
SCHACH: Brettspiel mit König und Dame | Spiel auf 64 Feldern
SCHATZ: Wertvoller Fund | Kosename
SCHERE: Schneidewerkzeug | Hat zwei Klingen
SCHICHT: Lage, Ebene | Arbeitszeitabschnitt
SCHILD: Hinweistafel | Schutzwaffe des Ritters
SCHLAF: Nachtruhe | Ruhezustand
SCHRIFT: Geschriebenes | Buchstaben auf Papier
SCHRITT: Bewegung eines Fußes | Etappe
SCHWAN: Weißer Wasservogel | Edler Vogel mit langem Hals
SCHWERT: Hiebwaffe des Ritters | Lange Klinge
SEGLER: Bootsfahrer mit Segel | Vogelart
SENDUNG: Fernsehprogramm | Paket
SERVICE: Dienstleistung | Kundendienst
SIRENE: Warnsignalgerät | Verführerische Sagengestalt
SKELETT: Knochengerüst | Gebein
SOCKEL: Unterbau | Fuß einer Statue
SPATZ: Kleiner Vogel | Sperling
SPEISE: Gericht | Mahlzeit
SPRUNG: Hüpfer | Riss im Glas
STEMPEL: Druckgerät für Abdrücke | Siegel
STEUER: Abgabe an den Staat | Lenkrad
STIEL: Griff eines Werkzeugs | Stängel der Blume
STIMME: Laut aus der Kehle | Votum bei der Wahl
STOLLEN: Gang im Bergwerk | Weihnachtsgebäck
STRAFE: Sanktion | Buße
STREIK: Arbeitsniederlegung | Ausstand
STRICK: Seil | Strang
STROH: Trockene Getreidehalme | Liegt im Stall
STURM: Starker Wind | Angriffsreihe im Fußball
SYMBOL: Sinnbild | Zeichen
TABELLE: Übersicht in Zeilen und Spalten | Rangliste
TAPETE: Wandbekleidung | Papier an der Wand
TASTE: Teil der Tastatur | Knopf am Klavier
TAUBE: Vogel des Friedens | Stadtvogel
TEMPEL: Heiligtum | Gotteshaus der Antike
TEPPICH: Bodenbelag aus Stoff | Läufer
TINTE: Schreibflüssigkeit | Farbe für den Füller
TITEL: Überschrift | Ehrenbezeichnung
TORTE: Festlicher Kuchen | Sahnegebäck
TRAKTOR: Landwirtschaftliche Zugmaschine | Fahrzeug des Bauern
TREPPE: Stufen zum nächsten Stockwerk | Stiege
TRESOR: Sicherer Geldschrank | Safe
TRIKOT: Sportkleidung | Fußballhemd
TROMMEL: Schlaginstrument | Rhythmusinstrument
TUMULT: Aufruhr | Lärm und Durcheinander
URTEIL: Richterspruch | Bewertung
VENTIL: Verschluss am Reifen | Regelt den Durchfluss
VERBAND: Wundumhüllung | Vereinigung
VERBOT: Untersagung | Gegenteil von Erlaubnis
VERLAG: Herausgeber von Büchern | Buchunternehmen
VERRAT: Treuebruch | Hintergehen
VITAMIN: Lebenswichtiger Nährstoff | Steckt in Obst
VORHANG: Stoff vor dem Fenster | Trennung zur Bühne
VORRAT: Gelagerte Menge | Reserve
WACHS: Material der Kerze | Bienenprodukt
WAGGON: Eisenbahnwagen | Teil des Zuges
WALZER: Tanz im Dreivierteltakt | Wiener Tanz
WANDEL: Veränderung | Umbruch
WANNE: Gefäß zum Baden | Großer Behälter
WEIZEN: Getreide für Brot | Brotgetreide
WERBUNG: Reklame | Anzeigen
WESPE: Stechendes Insekt | Gelb-schwarzer Flieger
WIDDER: Männliches Schaf | Sternzeichen
WIMPER: Haar am Augenlid | Augenhaar
WINKEL: Ecke | Geometrisches Maß in Grad
WOLLEN: Möchten | Beabsichtigen
WUNDE: Verletzung | Verletzte Stelle
WURZEL: Teil der Pflanze unter der Erde | Ursprung
ZAUBER: Magie | Hexerei
ZEILE: Reihe von Wörtern | Linie im Text
ZEUGE: Beobachter einer Tat | Sagt vor Gericht aus
ZIEGEL: Gebrannter Baustein | Dachstein
ZIFFER: Zahlzeichen | 0 bis 9
ZIGARRE: Dicke Tabakrolle | Rauchware
ZIRKEL: Gerät zum Kreiszeichnen | Zeichenwerkzeug
ZITAT: Wörtlich übernommene Stelle | Ausspruch
ZUSTAND: Beschaffenheit | Lage, Verfassung
ZWECK: Ziel, Absicht | Sinn einer Sache
`;

export const CLUES = {};
for (const line of RAW.split("\n")) {
  const i = line.indexOf(":"); if (i < 0) continue;
  const w = line.slice(0, i).trim().toUpperCase(), clues = line.slice(i + 1).split("|").map((s) => s.trim()).filter(Boolean);
  if (!/^[A-ZÄÖÜ]{3,8}$/.test(w) || !clues.length) continue;
  (CLUES[w] ||= []).push(...clues.filter((c) => !CLUES[w].includes(c)));
}
/** Wörter nach Länge: WORDS_BY_LEN[len] = ["HAUS", …] */
export const WORDS_BY_LEN = {};
for (const w of Object.keys(CLUES)) (WORDS_BY_LEN[w.length] ||= []).push(w);

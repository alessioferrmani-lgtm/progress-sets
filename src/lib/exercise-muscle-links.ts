import type { MuscleGroup } from "./muscle-map.ts";

// Each existing catalog and personal exercise has an explicit anatomical association.
// References: ACE exercise library; BJSM Copenhagen adduction study; NCBI hip-abductor anatomy.
export const EXERCISE_MUSCLE_LINKS: Record<string, readonly MuscleGroup[]> = {
  "a march": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "a skip": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "ab wheel": [
    "abs"
  ],
  "ab wheel rollout": [
    "abs"
  ],
  "abduttori macchina": [
    "abductors",
    "glutes"
  ],
  "accelerazione 100 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "accelerazione 20 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "accelerazione 30 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "accelerazione 50 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "accelerazione 80 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "adduttori macchina": [
    "adductors"
  ],
  "affondi": [
    "quads",
    "glutes"
  ],
  "affondi camminati": [
    "quads",
    "glutes"
  ],
  "affondi con bilanciere": [
    "quads",
    "glutes"
  ],
  "affondi con manubri": [
    "quads",
    "glutes"
  ],
  "affondi indietro": [
    "quads",
    "glutes"
  ],
  "affondo dinamico": [
    "quads",
    "glutes"
  ],
  "alfabeto con la caviglia": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "allunghi": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "allunghi e accelerazioni": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "allunghi progressivi": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "allungo": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "alternate bounds": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "alternating pogo": [
    "calves",
    "tibialis",
    "feet"
  ],
  "alzate frontali": [
    "shoulders"
  ],
  "alzate laterali": [
    "shoulders"
  ],
  "alzate laterali ai cavi": [
    "shoulders"
  ],
  "alzate posteriori": [
    "shoulders",
    "back"
  ],
  "andature a": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ankle bounce": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "ankle eversion con elastico": [
    "peroneals"
  ],
  "ankle hop": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "ankle inversion con elastico": [
    "tibialis"
  ],
  "ankle pumps": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "ankling": [
    "calves",
    "tibialis",
    "feet"
  ],
  "arnold press": [
    "shoulders",
    "triceps"
  ],
  "b skip": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "back extension": [
    "lowerBack",
    "glutes",
    "hamstrings"
  ],
  "back extension 45 gradi": [
    "lowerBack",
    "glutes",
    "hamstrings"
  ],
  "backpedal": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "backward hop": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "balzi a piedi pari": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "balzi alternati": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "band pull apart": [
    "shoulders",
    "back"
  ],
  "battle rope": [
    "shoulders",
    "forearms",
    "abs"
  ],
  "bayesian curl": [
    "biceps"
  ],
  "bear crawl": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "bear plank": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "bear plank shoulder tap": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "bicycle crunch": [
    "abs"
  ],
  "billat 30 30": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "bird dog": [
    "abs",
    "lowerBack",
    "glutes"
  ],
  "bird dog row": [
    "back",
    "biceps",
    "abs",
    "obliques",
    "lowerBack"
  ],
  "body saw": [
    "abs"
  ],
  "bounding": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "bounds": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "box drill": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "box jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "box jump con rincorsa": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "box jump down controllato": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "box jump over": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "broad jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "build up run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "bulgarian split squat": [
    "quads",
    "glutes"
  ],
  "burpee box jump": [
    "chest",
    "triceps",
    "shoulders",
    "quads",
    "glutes",
    "calves",
    "abs"
  ],
  "burpees": [
    "chest",
    "triceps",
    "shoulders",
    "quads",
    "glutes",
    "calves",
    "abs"
  ],
  "butterfly sit up": [
    "abs"
  ],
  "c skip": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "cable crunch": [
    "abs"
  ],
  "cable woodchop": [
    "obliques",
    "abs"
  ],
  "cable woodchop alto basso": [
    "obliques",
    "abs"
  ],
  "cable woodchop basso alto": [
    "obliques",
    "abs"
  ],
  "calciata dietro": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "calf raise": [
    "calves"
  ],
  "calf raise a ginocchio esteso": [
    "calves"
  ],
  "calf raise a ginocchio flesso": [
    "calves"
  ],
  "calf raise a una gamba": [
    "calves"
  ],
  "calf raise al multipower": [
    "calves"
  ],
  "calf raise alla pressa": [
    "calves"
  ],
  "calf raise con manubri": [
    "calves"
  ],
  "calf raise in piedi": [
    "calves"
  ],
  "calf raise seduto": [
    "calves"
  ],
  "calf raise su step": [
    "calves"
  ],
  "camminata defaticante": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "camminata sui talloni": [
    "tibialis"
  ],
  "camminata sul bordo esterno del piede": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "camminata sulle punte": [
    "calves"
  ],
  "camminata tallone punta": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "camminata veloce": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "candlestick": [
    "abs",
    "quads"
  ],
  "captain s chair knee raise": [
    "abs",
    "quads"
  ],
  "captain s chair leg raise": [
    "abs",
    "quads"
  ],
  "carioca": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "carioca drill": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "chest press": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "circonduzioni caviglia": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "clamshell": [
    "abductors",
    "glutes"
  ],
  "clap push up": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "clean": [
    "quads",
    "glutes",
    "hamstrings",
    "back",
    "shoulders",
    "triceps"
  ],
  "cone drill": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "consecutive broad jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "consecutive hurdle jump": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "cooper test": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "copenhagen plank": [
    "adductors",
    "obliques"
  ],
  "copenhagen plank facilitato": [
    "adductors",
    "obliques"
  ],
  "corsa": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a otto": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a ritmo 10 km": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a ritmo 5 km": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a ritmo gara": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a ritmo maratona": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a ritmo medio": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a ritmo mezza maratona": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a ritmo sostenuto": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa a variazioni": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa aerobica": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa all indietro": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa alla soglia": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa balzata": [
    "shoulders"
  ],
  "corsa calciata": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa con passeggino": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa con zavorra": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa continua": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa continua collinare": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa di recupero": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa facile": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa in acqua": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa in salita": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa incrociata": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa laterale": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa lenta": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa lunga progressiva": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa progressiva": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa regressiva": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa su gradini": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa su tapis roulant": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa sulla sabbia": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "corsa camminata": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "countermovement jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "crab walk": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "croci ai cavi": [
    "chest"
  ],
  "croci con manubri": [
    "chest"
  ],
  "cross body mountain climber": [
    "abs",
    "quads"
  ],
  "cross country": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "crossover ai cavi": [
    "chest"
  ],
  "crossover hop": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "crossover run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "crunch": [
    "abs"
  ],
  "crunch a terra": [
    "abs"
  ],
  "crunch al cavo": [
    "abs"
  ],
  "crunch alla macchina": [
    "abs"
  ],
  "crunch inverso": [
    "abs"
  ],
  "crunch su fitball": [
    "abs"
  ],
  "cuban press": [
    "shoulders"
  ],
  "curl a martello al cavo": [
    "biceps",
    "forearms"
  ],
  "curl ai cavi": [
    "biceps"
  ],
  "curl alla panca scott": [
    "biceps"
  ],
  "curl alternato con manubri": [
    "biceps"
  ],
  "curl con bilanciere": [
    "biceps"
  ],
  "curl con bilanciere ez": [
    "biceps"
  ],
  "curl con manubri": [
    "biceps"
  ],
  "curl concentrato": [
    "biceps"
  ],
  "curl inclinato con manubri": [
    "biceps"
  ],
  "curl inverso": [
    "biceps",
    "forearms"
  ],
  "curl machine": [
    "biceps"
  ],
  "cyclette": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "dead bug": [
    "abs"
  ],
  "dead bug con elastico": [
    "abs"
  ],
  "dead bug con palla": [
    "abs"
  ],
  "depth jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "depth jump oltre ostacolo": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "depth jump to box": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "depth push up": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "diagonal hop": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "dip alle parallele": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "dip tricipiti alla panca": [
    "triceps",
    "chest",
    "shoulders"
  ],
  "donkey calf raise": [
    "calves"
  ],
  "dorsiflessione con elastico": [
    "tibialis"
  ],
  "dribbling alto": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "dribbling basso": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "dribbling medio": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "drop jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "ellittica": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "equilibrio monopodalico": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "equilibrio monopodalico instabile": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "equilibrio su una gamba": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "estensioni sopra la testa ai cavi": [
    "triceps"
  ],
  "eversione caviglia con elastico": [
    "peroneals"
  ],
  "explosive incline push up": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "explosive wall pass": [
    "chest",
    "shoulders",
    "triceps"
  ],
  "external rotation ai cavi": [
    "obliques",
    "abs"
  ],
  "face pull": [
    "shoulders",
    "back"
  ],
  "falling start": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "farmer carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "farmer carry asimmetrico": [
    "forearms",
    "abs",
    "obliques"
  ],
  "farmer walk": [
    "forearms",
    "abs",
    "obliques"
  ],
  "fartlek": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "fartlek collinare": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "fast feet": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "fast leg drill": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "figure eight run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "flessione plantare con elastico": [
    "calves"
  ],
  "float sprint": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "floor press": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "flutter kick": [
    "abs",
    "quads"
  ],
  "flying sprint": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "foam roller fascia laterale della coscia": [
    "abductors"
  ],
  "foam roller glutei": [
    "glutes"
  ],
  "foam roller ischiocrurali": [
    "hamstrings"
  ],
  "foam roller polpacci": [
    "calves"
  ],
  "foam roller quadricipiti": [
    "quads"
  ],
  "fondo lento": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "fondo lungo": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "fondo medio": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "forward hop": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "forward backward hurdle hop": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "french press": [
    "triceps"
  ],
  "french press manubri": [
    "triceps"
  ],
  "frog jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "front rack carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "front squat": [
    "quads",
    "glutes"
  ],
  "garhammer raise": [
    "abs",
    "quads"
  ],
  "glute bridge": [
    "glutes",
    "hamstrings"
  ],
  "goblet squat": [
    "quads",
    "glutes"
  ],
  "good morning": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "good morning isometrico": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "grapevine": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "hack squat": [
    "quads",
    "glutes"
  ],
  "hammer curl": [
    "biceps",
    "forearms"
  ],
  "hanging knee raise": [
    "abs",
    "quads"
  ],
  "hanging leg raise": [
    "abs",
    "quads"
  ],
  "hanging windshield wiper": [
    "obliques",
    "abs"
  ],
  "heel tap": [
    "abs"
  ],
  "hex press": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "high box jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "high knees": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "high row": [
    "back",
    "biceps"
  ],
  "high intensity interval running": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "hill bounds": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "hill repeats": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "hip abduction": [
    "abductors",
    "glutes"
  ],
  "hip hinge isometrico": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "hip thrust": [
    "glutes",
    "hamstrings"
  ],
  "hollow body hold": [
    "abs"
  ],
  "hollow body rock": [
    "abs"
  ],
  "hop and hold": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "hop and stick": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "hurdle hop monopodalico": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "hurdle jump": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "hyperextension": [
    "lowerBack",
    "glutes",
    "hamstrings"
  ],
  "illinois agility test": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "inchworm": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "ins and outs": [
    "abs",
    "quads"
  ],
  "interval training": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli 4 4 minuti": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli 60 60": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli a scala": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli a tempo": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli aerobici": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli anaerobici": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli decrescenti": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli misti": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli piramidali": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "intervalli progressivi": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "inversione caviglia con elastico": [
    "tibialis"
  ],
  "iperestensioni": [
    "lowerBack",
    "glutes",
    "hamstrings"
  ],
  "jackknife": [
    "abs",
    "quads"
  ],
  "jm press": [
    "triceps",
    "chest",
    "shoulders"
  ],
  "jogging": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "jogging defaticante": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "jogging leggero": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "jump and reach": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "jump rope": [
    "calves",
    "tibialis",
    "feet"
  ],
  "jumping lunge": [
    "quads",
    "glutes",
    "calves"
  ],
  "kettlebell swing": [
    "glutes",
    "hamstrings",
    "lowerBack",
    "forearms"
  ],
  "kickback con manubri": [
    "triceps"
  ],
  "knee tuck jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "l drill": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "l sit": [
    "abs",
    "quads"
  ],
  "l sit facilitato": [
    "abs",
    "quads"
  ],
  "landmine chest press": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "landmine rainbow": [
    "obliques",
    "abs"
  ],
  "landmine rotation": [
    "obliques",
    "abs"
  ],
  "landmine shoulder press": [
    "shoulders",
    "triceps"
  ],
  "lat machine": [
    "back",
    "biceps"
  ],
  "lat machine presa inversa": [
    "back",
    "biceps"
  ],
  "lateral band walk": [
    "abductors",
    "glutes"
  ],
  "lateral bound": [
    "quads",
    "glutes",
    "abductors",
    "calves"
  ],
  "lateral box jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "lateral hop": [
    "quads",
    "glutes",
    "abductors",
    "calves"
  ],
  "lateral hurdle hop": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "lateral line hop": [
    "quads",
    "glutes",
    "abductors",
    "calves"
  ],
  "lateral shuffle": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "lean fall run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "leg curl": [
    "hamstrings"
  ],
  "leg curl sdraiato": [
    "hamstrings"
  ],
  "leg curl seduto": [
    "hamstrings"
  ],
  "leg extension": [
    "quads"
  ],
  "leg press": [
    "quads",
    "glutes"
  ],
  "leg raise a terra": [
    "abs",
    "quads"
  ],
  "leg raise su panca": [
    "abs",
    "quads"
  ],
  "leg swing frontale": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "leg swing laterale": [
    "adductors",
    "abductors"
  ],
  "lento avanti con manubri": [
    "shoulders",
    "triceps"
  ],
  "leopard crawl": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "line hop": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "long lever plank": [
    "abs",
    "obliques"
  ],
  "low box jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "marcia con kettlebell sopra la testa": [
    "shoulders",
    "abs",
    "obliques"
  ],
  "marcia in ponte": [
    "glutes",
    "hamstrings"
  ],
  "marcia tecnica": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "meadows row": [
    "back",
    "biceps"
  ],
  "medicine ball chest pass": [
    "chest",
    "shoulders",
    "triceps"
  ],
  "medicine ball overhead throw": [
    "back",
    "biceps"
  ],
  "medicine ball rotational throw": [
    "obliques",
    "abs"
  ],
  "medicine ball side throw": [
    "obliques",
    "abs"
  ],
  "medicine ball slam": [
    "back",
    "shoulders",
    "abs",
    "obliques"
  ],
  "military press": [
    "shoulders",
    "triceps"
  ],
  "mini hurdle hop": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "mirror drill": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "mobilita dell anca": [
    "glutes",
    "adductors",
    "quads"
  ],
  "mobilita della caviglia": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "monster walk": [
    "abductors",
    "glutes"
  ],
  "mountain climber": [
    "abs",
    "quads"
  ],
  "mountain climber controllato": [
    "abs",
    "quads"
  ],
  "multidirectional sprint": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "navetta 5 10 5": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "nordic hamstring curl": [
    "hamstrings"
  ],
  "offset farmer carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "overhead carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "pallof press": [
    "abs",
    "obliques"
  ],
  "pallof press in ginocchio": [
    "abs",
    "obliques"
  ],
  "pallof press isometrica": [
    "abs",
    "obliques"
  ],
  "pallof press mezzo inginocchio": [
    "abs",
    "obliques"
  ],
  "pallof press sopra la testa": [
    "abs",
    "obliques"
  ],
  "pallof walkout": [
    "abs",
    "obliques"
  ],
  "panca con presa neutra manubri": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "panca declinata con bilanciere": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "panca inclinata con bilanciere": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "panca inclinata con manubri": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "panca piana con bilanciere": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "panca piana con manubri": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "panca stretta": [
    "triceps",
    "chest",
    "shoulders"
  ],
  "pawback drill": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "pectoral machine": [
    "chest"
  ],
  "pelvic tilt": [
    "abs"
  ],
  "pike push up": [
    "shoulders",
    "triceps"
  ],
  "pistol squat": [
    "quads",
    "glutes"
  ],
  "plank": [
    "abs",
    "obliques"
  ],
  "plank alto": [
    "abs",
    "obliques"
  ],
  "plank bird dog": [
    "abs",
    "lowerBack",
    "glutes"
  ],
  "plank con ginocchia appoggiate": [
    "abs",
    "obliques"
  ],
  "plank con sollevamento braccio": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "plank con sollevamento gamba": [
    "abs",
    "obliques",
    "glutes"
  ],
  "plank con trascinamento del peso": [
    "abs",
    "obliques"
  ],
  "plank shoulder taps": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "plank sui gomiti": [
    "abs",
    "obliques"
  ],
  "plank walkout": [
    "abs",
    "obliques"
  ],
  "plantarflessione con elastico": [
    "calves"
  ],
  "plate pinch hold": [
    "forearms"
  ],
  "plyometric push up": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "pogo jump": [
    "calves",
    "tibialis",
    "feet"
  ],
  "power hiking": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "pressa 45": [
    "quads",
    "glutes"
  ],
  "pro agility test": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "progressione breve": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "pull up assistite": [
    "back",
    "biceps"
  ],
  "pulldown": [
    "back",
    "biceps"
  ],
  "pulley basso": [
    "back",
    "biceps"
  ],
  "pullover con manubrio": [
    "back",
    "chest"
  ],
  "push down ai cavi": [
    "triceps"
  ],
  "push down corda": [
    "triceps"
  ],
  "push up": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "push up declinato": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "push up inclinato": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "quadrupedia con estensione alternata": [
    "abs",
    "lowerBack",
    "glutes"
  ],
  "quick ground contact jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "quick hurdle hop": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "rack pull": [
    "hamstrings",
    "glutes",
    "lowerBack",
    "back"
  ],
  "reaction sprint": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "reactive drop jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "rear delt row": [
    "shoulders",
    "back"
  ],
  "rematore chest supported": [
    "back",
    "biceps"
  ],
  "rematore con bilanciere": [
    "back",
    "biceps"
  ],
  "rematore con manubrio": [
    "back",
    "biceps"
  ],
  "rematore t bar": [
    "back",
    "biceps"
  ],
  "rematore unilaterale al cavo": [
    "back",
    "biceps"
  ],
  "renegade row": [
    "back",
    "biceps",
    "abs",
    "obliques",
    "lowerBack"
  ],
  "respirazione diaframmatica": [
    "abs"
  ],
  "reverse crunch": [
    "abs"
  ],
  "reverse hyperextension": [
    "lowerBack",
    "glutes",
    "hamstrings"
  ],
  "reverse pec deck": [
    "shoulders",
    "back"
  ],
  "reverse wrist curl": [
    "forearms"
  ],
  "ripetute brevi": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute brevi in salita": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 1 000 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 1 200 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 1 600 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 100 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 2 000 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 200 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 3 000 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 300 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 400 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 50 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 500 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute da 800 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute lunghe": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute lunghe in salita": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "ripetute medie": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "rkc plank": [
    "abs",
    "obliques"
  ],
  "rocket jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "rolling dumbbell triceps extension": [
    "triceps"
  ],
  "rollout con bilanciere": [
    "abs"
  ],
  "rollout su fitball": [
    "abs"
  ],
  "romanian deadlift": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "rope climb": [
    "back",
    "biceps",
    "forearms",
    "abs"
  ],
  "rotational medicine ball throw": [
    "obliques",
    "abs"
  ],
  "rotazioni al cavo": [
    "obliques",
    "abs"
  ],
  "russian twist": [
    "obliques",
    "abs"
  ],
  "salita a ritmo soglia": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "salita su tapis roulant": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "scaption raise": [
    "shoulders"
  ],
  "scapular pull up": [
    "back"
  ],
  "scissor jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "scissor kick": [
    "abs",
    "quads"
  ],
  "scoop toss": [
    "chest",
    "shoulders",
    "triceps"
  ],
  "scrollate con bilanciere": [
    "back"
  ],
  "scrollate con manubri": [
    "back"
  ],
  "seal row": [
    "back",
    "biceps"
  ],
  "seated box jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "seated toe raise": [
    "tibialis"
  ],
  "short foot": [
    "feet"
  ],
  "shot put throw": [
    "back",
    "biceps"
  ],
  "shoulder press": [
    "shoulders",
    "triceps"
  ],
  "shoulder tap": [
    "abs",
    "obliques",
    "shoulders"
  ],
  "shuttle run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "shuttle sprint": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "side plank": [
    "abs",
    "obliques"
  ],
  "side plank con abduzione della gamba": [
    "obliques",
    "abductors",
    "glutes"
  ],
  "side plank con ginocchia appoggiate": [
    "abs",
    "obliques"
  ],
  "side plank star": [
    "obliques",
    "abductors",
    "glutes"
  ],
  "side plank sui piedi": [
    "abs",
    "obliques"
  ],
  "side lying hip abduction": [
    "abductors",
    "glutes"
  ],
  "single arm farmer carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "single arm front rack carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "single leg bound": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "single leg box jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "single leg broad jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "single leg calf raise": [
    "calves"
  ],
  "single leg cycle": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "single leg depth jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "single leg glute bridge": [
    "glutes",
    "hamstrings"
  ],
  "single leg hop": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "single leg hurdle hop": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "single leg pogo": [
    "calves",
    "tibialis",
    "feet"
  ],
  "single leg romanian deadlift": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "single leg squat": [
    "quads",
    "glutes"
  ],
  "sit up": [
    "abs"
  ],
  "sit up con peso": [
    "abs"
  ],
  "skater jump": [
    "quads",
    "glutes",
    "abductors",
    "calves"
  ],
  "skip": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "skip alto": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "skip basso": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "skip medio": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "skull crusher": [
    "triceps"
  ],
  "slam ball": [
    "back",
    "shoulders",
    "abs",
    "obliques"
  ],
  "sled pull": [
    "back",
    "forearms",
    "quads",
    "glutes",
    "calves"
  ],
  "sled push": [
    "quads",
    "glutes",
    "calves",
    "abs"
  ],
  "snatch": [
    "quads",
    "glutes",
    "hamstrings",
    "back",
    "shoulders",
    "triceps"
  ],
  "soleus raise": [
    "calves"
  ],
  "spider curl": [
    "biceps"
  ],
  "split squat": [
    "quads",
    "glutes"
  ],
  "split squat jump": [
    "quads",
    "glutes",
    "calves"
  ],
  "sprint": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint 10 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint 100 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint 20 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint 30 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint 40 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint 60 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint 80 metri": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint assistito": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint con arresto": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint con cambio di direzione": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint con elastico": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint con partenza da fermo": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint con partenza lanciata": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint con slitta": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint e cambio direzione": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint in discesa controllata": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint in salita": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint interval training": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint resistito": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint ripetuti": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "sprint float sprint": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "squat": [
    "quads",
    "glutes"
  ],
  "squat con bilanciere": [
    "quads",
    "glutes"
  ],
  "squat dinamico": [
    "quads",
    "glutes"
  ],
  "squat jump": [
    "quads",
    "glutes",
    "calves"
  ],
  "stability ball rollout": [
    "abs"
  ],
  "stacco da terra": [
    "hamstrings",
    "glutes",
    "lowerBack",
    "back"
  ],
  "stacco rumeno": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "stacco sumo": [
    "quads",
    "glutes",
    "adductors",
    "lowerBack",
    "back"
  ],
  "standing long jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "star jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "step down": [
    "quads",
    "glutes"
  ],
  "step up": [
    "quads",
    "glutes"
  ],
  "step up jump": [
    "quads",
    "glutes",
    "calves"
  ],
  "stir the pot": [
    "abs"
  ],
  "straight arm pulldown": [
    "back",
    "chest"
  ],
  "straight leg run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "stretching adduttori": [
    "adductors"
  ],
  "stretching flessori dell anca": [
    "quads",
    "abs"
  ],
  "stretching glutei": [
    "glutes"
  ],
  "stretching ischiocrurali": [
    "hamstrings"
  ],
  "stretching polpacci": [
    "calves"
  ],
  "stretching quadricipiti": [
    "quads"
  ],
  "stretching soleo": [
    "calves"
  ],
  "stride": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "suitcase carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "superman": [
    "lowerBack",
    "glutes",
    "hamstrings"
  ],
  "svend press": [
    "chest"
  ],
  "swimmer": [
    "lowerBack",
    "glutes",
    "hamstrings"
  ],
  "t test": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "tapis roulant": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "tate press": [
    "triceps"
  ],
  "tempo run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "test cronometrato": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "threshold run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "thruster": [
    "quads",
    "glutes",
    "hamstrings",
    "back",
    "shoulders",
    "triceps"
  ],
  "tibialis raise": [
    "tibialis"
  ],
  "time trial": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "toe curl": [
    "feet"
  ],
  "toe raise": [
    "tibialis"
  ],
  "toe touch": [
    "abs"
  ],
  "toe yoga": [
    "feet"
  ],
  "toes to bar": [
    "abs",
    "quads"
  ],
  "towel scrunches": [
    "feet"
  ],
  "trail running": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "trazioni alla sbarra": [
    "back",
    "biceps"
  ],
  "triceps extension machine": [
    "triceps"
  ],
  "triple broad jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "triple hop": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "tuck jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "tuck up": [
    "abs",
    "quads"
  ],
  "turkish get up": [
    "shoulders",
    "abs",
    "obliques",
    "glutes",
    "quads"
  ],
  "v up": [
    "abs",
    "quads"
  ],
  "vertical jump": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "vogatore": [
    "back",
    "biceps",
    "quads",
    "hamstrings",
    "glutes"
  ],
  "waiter carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "waiter carry a un braccio": [
    "forearms",
    "abs",
    "obliques"
  ],
  "wall drill": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "wall switch": [
    "quads",
    "glutes",
    "hamstrings",
    "calves"
  ],
  "weighted jump squat": [
    "quads",
    "glutes",
    "calves"
  ],
  "wicket drill": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "windshield wiper": [
    "obliques",
    "abs"
  ],
  "world s greatest stretch": [
    "glutes",
    "adductors",
    "quads"
  ],
  "wrist curl": [
    "forearms"
  ],
  "wrist roller": [
    "forearms"
  ],
  "y raise": [
    "shoulders",
    "back"
  ],
  "yasso 800": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "zercher carry": [
    "forearms",
    "abs",
    "obliques"
  ],
  "zig zag hurdle jump": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "zig zag run": [
    "quads",
    "hamstrings",
    "glutes",
    "calves"
  ],
  "zottman curl": [
    "biceps",
    "forearms"
  ],
  "couch stretch": [
    "quads"
  ],
  "step up controllato": [
    "quads",
    "glutes"
  ],
  "stretching pettorale": [
    "chest"
  ],
  "stretching gran dorsale": [
    "back"
  ],
  "open book toracico": [
    "back"
  ],
  "standing cable hip flexion": [
    "quads",
    "abs"
  ],
  "kettlebell swing esplosivo": [
    "glutes",
    "hamstrings",
    "lowerBack",
    "forearms"
  ],
  "hip flexor march al cavo elastico": [
    "quads",
    "abs"
  ],
  "stretching gluteo": [
    "glutes"
  ],
  "back extension 45": [
    "lowerBack",
    "glutes",
    "hamstrings"
  ],
  "overhead cable triceps extension": [
    "triceps"
  ],
  "knee to wall mobilita caviglia": [
    "tibialis",
    "peroneals",
    "calves",
    "feet"
  ],
  "box squat": [
    "quads",
    "glutes"
  ],
  "curl bilanciere ez": [
    "biceps"
  ],
  "stretching flessori anca": [
    "quads",
    "abs"
  ],
  "calf raise isometrico monopodalico a gamba tesa": [
    "calves"
  ],
  "soleus isometrico monopodalico a ginocchio piegato": [
    "calves"
  ],
  "big toe press isometrico": [
    "feet"
  ],
  "adductor rock back": [
    "adductors"
  ],
  "pogo jump bilaterali": [
    "calves",
    "tibialis",
    "feet"
  ],
  "pushdown cavo": [
    "triceps"
  ],
  "calf raise monopodalico": [
    "calves"
  ],
  "trap bar deadlift": [
    "quads",
    "glutes",
    "hamstrings",
    "lowerBack",
    "back"
  ],
  "chest pass con palla medica da seduto": [
    "chest",
    "shoulders",
    "triceps"
  ],
  "push press": [
    "shoulders",
    "triceps",
    "quads",
    "glutes"
  ],
  "dip": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "trazioni": [
    "back",
    "biceps"
  ],
  "eversione inversione caviglia con elastico": [
    "tibialis",
    "peroneals"
  ],
  "aperture laterali manubrio": [
    "shoulders"
  ],
  "box squat fino sopra il parallelo": [
    "quads",
    "glutes"
  ],
  "dip petto": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "rematore inclinato bilanciere singolo": [
    "back",
    "biceps"
  ],
  "incline bench press con manubri": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "anti rotation core pallof o variante": [
    "abs",
    "obliques"
  ],
  "farmer hold da seduto": [
    "forearms",
    "abs",
    "obliques"
  ],
  "rematore con petto appoggiato": [
    "back",
    "biceps"
  ],
  "shoulder press manubri": [
    "shoulders",
    "triceps"
  ],
  "trap bar deadlift con maniglie alte": [
    "quads",
    "glutes",
    "hamstrings",
    "lowerBack",
    "back"
  ],
  "calf raise monopodalico in piedi pesante": [
    "calves"
  ],
  "pull up": [
    "back",
    "biceps"
  ],
  "leg curl da seduto": [
    "hamstrings"
  ],
  "box step up controllato": [
    "quads",
    "glutes"
  ],
  "panca inclinata manubri": [
    "chest",
    "triceps",
    "shoulders"
  ],
  "rematore bilanciere": [
    "back",
    "biceps"
  ],
  "dead bug caricato": [
    "abs"
  ],
  "rdl bilaterale": [
    "hamstrings",
    "glutes",
    "lowerBack"
  ],
  "shoulder press da seduto con manubri": [
    "shoulders",
    "triceps"
  ],
  "soleus raise da seduto pesante": [
    "calves"
  ]
};

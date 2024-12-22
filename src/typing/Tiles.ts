import { MakerMap } from "../utils/LevelFactory";
import { randArrPos, rollChanceLTE } from "../utils/LogicHelpers";

type Mapish = { [k: string]: boolean };
export type Con = keyof Mapish;

export interface RawTile {
    id: number;
    connections: Con[][];
};

/**
 * Used as base for both Logic Tiles as `MapTile` and 
 * Rendering Cells as `CellData`
 */
export class TileData {
    id = 0;
    connections = [["", 0]];

    constructor(tileData: RawTile){
        this.id = tileData.id;
        this.connections = tileData.connections;
    }
};

/**
 * Used for controller logic and handling, used as the middleware for user inputs
 */
export class MapTile extends TileData {
    constructor(tileData: TileData){
        super(tileData);
    }

    updateInternals(newData: TileData) {
        this.id = newData.id;
        this.connections = newData.connections;
    }
    
    enabledConnections(){
        return this.connections.map(([k,]) => k);
    }

    moveDirectionsID(direction: string){
        return this.connections.find(([k,]) => k === direction)?.[1] ?? this.id;
    }
};

enum ContentType {
    Item = 1,
    Enemy = 2,
    Event = 3
};

interface CellContent {
    type: ContentType;
};

/**
 * Used to store static level data for rendering, and dynamic data for user interactive
 * elements: such as contents
 */
export class CellData extends TileData {
    activeCell = false;
    contents: Array<CellContent>;
    hasContents = false;
    rolledContents = false;
    accessPath: Array<number> = [];
    constructor(tileData: TileData){
        super(tileData);
        this.contents = [];
        this.hasContents = false;
        this.rolledContents = false;
        this.accessPath = [];
    }

    rollContents() {
        if (rollChanceLTE(0.75)){
            this.hasContents = true;
            this.fillContents();
        }

        this.rolledContents = true;
    }

    fillContents() {
        const typePicked = randArrPos([ { type: ContentType.Item }, { type: ContentType.Enemy }, { type: ContentType.Event } ]);
        this.contents.push(typePicked);
        return;
    }

    fillPathway(path: Array<number>) {
        this.accessPath = path;
    }

    get pathing() {
        return this.accessPath;
    }
};

const emptyTile = new TileData({ id: 0, connections: [["", 0]]});
//emptyCell = new CellData({ id: 0, connections: [["", 0]]});

/**
 * Used to store and manage level game state
 * 
 * `populateBase()` is the init method for the current level
 * It will load a set of levelTiles as `TileData` and cellTiles as `CellData`
 */
export class CellManager {
    levelTiles: Array<TileData>;
    activeTile: MapTile;
    tiledCells: Array<CellData>;
    reachableCells: Array<Con>;
    encounteredCells: Array<Con>;
    constructor() { 
        this.levelTiles = [];
        this.tiledCells = [];
        this.reachableCells = [];
        this.encounteredCells = [];
        this.activeTile = new MapTile(emptyTile);
    }

    /**
     * This method handles loading both the `TileData` & `CellData` arrays
     * @param levelData RawTile list of all basic tiles for level to be loaded
     * @returns Final length of tiles loaded
     */
    populateBase(levelData: RawTile[]) {
        this.levelTiles = [...levelData.map(raw => new TileData(raw))];
        this.__loadBlankCells();
        this.__populateSpawnTile();
        return this.levelTiles.length;
    }

    /**
     * This method will allow for complex control of how a level is allowed to be generated,
     * using the generated raw data from the given `function` it will preform a series of checks
     * 
     * CHECKS: 
     *  - Count tile distance accessable from spawn
     *      - If less than x, reroll
     *  - TBD
     * 
     * @param levelLoader Function that returns a list of `RawTile` objects
     * @param options Options to be passed to the `levelLoader` function
     * @returns Final length of tiles loaded
     */
    populateBaseAdvanced(levelLoader: (args: MakerMap) => RawTile[], options: MakerMap) {
        const reloadLevel = () => {
            this.levelTiles = [...levelLoader(options).map(raw => new TileData(raw))];
        };
        
        reloadLevel();
        
        // this.levelTiles has been populated, now we need to check if the level is valid
        let levelValid = false;
        
        const levelRules = {
            minDistance: 15
        };

        const checkMinDistance = () => {
            let distance = 0;
            // Grab the spawn tile, this should be done for every failed generation to ensure updated data is present
            const spawnTile = this.levelTiles.find(tile => tile.id === 1);
            if (!spawnTile) return false;

            // Load initial connections from the spawn tile
            const tilesWaiting: Array<Con> = Array.from(spawnTile.connections.map(conArr => conArr[1]));
            const tilesChecked: Array<Con> = [1];

            // console.log('Initial connections from spawn tile: ', tilesWaiting);

            let failSafe = this.levelTiles.length;

            // Loop through connection tiles until they run out, or early return is reached
            while(tilesWaiting.length > 0 && failSafe > 0){
                const nextTile = this.levelTiles.find(tile => tile.id === tilesWaiting[0]);
                // console.log('Next tile picked: ', nextTile);
                if (!nextTile) continue;

                // Remove currently checked tile from the waitlist
                tilesWaiting.shift();

                // If the next tile has already been checked, skip it
                if (tilesChecked.includes(nextTile.id)) continue;

                tilesChecked.push(nextTile.id);

                // Add the next tile's connections to the waitlist
                tilesWaiting.push(...nextTile.connections.map(conArr => conArr[1]));

                distance++;
                failSafe--;
            }

            this.reachableCells = tilesChecked;

            return distance >= levelRules.minDistance;
        }

        const maxRetries = 8;

        let tries = maxRetries;
        while (!levelValid && tries > 0){
            checkMinDistance() ? levelValid = true : reloadLevel();
            if (!levelValid) tries--;
        }

        if (!levelValid) {
            console.error('Failed to generate valid level after %d tries', maxRetries);
            return 0;
        }

        this.__loadBlankCells();
        this.__populateSpawnTile();
        return this.levelTiles.length;
    }

    __loadBlankCells() {
        this.tiledCells = [...this.levelTiles.map(tile => new CellData(tile))];
    }

    __populateSpawnTile() {
        this.activeTile = new MapTile(this.levelTiles[0]);
        this.__updateActiveCell();
    }

    __updateActiveCell() {
        // Setting all cells currently active to inactive
        if (this.tiledCells.filter(tile => tile.activeCell).length > 0) {
            this.tiledCells.filter(tile => tile.activeCell).forEach((cell) => cell.activeCell = false);
        }
        // Setting newly activated cell to active
        (this.tiledCells.find(tile => tile.id === this.activeTile.id) ?? this.tiledCells[0]).activeCell = true;
    
        // Implement FOW based on newly activated cell
        if (!this.activeTile) return;
        
        for (const con of this.activeTile.connections){
            const cell = this.tiledCells.find(tile => tile.id === con[1]);
            if (cell) this.encounteredCells.push(cell.id);
        }
    }

    /**
     * This method handles populating the `contents` of all unrolled cells in `.tiledCells`
     * @returns Length of cells that rolled for new contents
     */
    populateCells() {
        const needsLoading = (c: CellData) => !c.activeCell && !c.rolledContents;
        const unloadedCells = this.tiledCells.filter(cell => needsLoading(cell));
        for (const cleanCell of unloadedCells){
            cleanCell.rollContents();
        }

        return unloadedCells.length;
    }

    /**
     * This method handles populating `CellData` contents, while using additional checks.
     * 
     * CHECKS:
     *  - Perform pathing for each event/pickup/enemy to determine if it can be reached from the spawn tile
     *      - TEMP (Log details of pathing if cell with contents is unreachable)
     */
    populateCellsAdvanced() {
        // const refreshCells = () => {
        //     this.__loadBlankCells();
        //     this.__populateSpawnTile();
        // };

        const checkShortestPath = (targetCell: CellData) => {
            const spawnTile = this.levelTiles.find(tile => tile.id === 1);
            if (!spawnTile) return console.error('Spawn tile not found');

            // Load initial connections from the spawn tile
            const tilesWaiting: Array<number> = Array.from(spawnTile.connections.map(conArr => !isNaN(Number(conArr[1])) ? Number(conArr[1]) : 0));
            const tilesChecked: Map<number, number> = new Map([]);

            //console.log('Initial connections from spawn tile: ', tilesWaiting);
            for (const spawnCon of tilesWaiting){
                tilesChecked.set(spawnCon, 1);
            }

            // Loop through connection tiles until they run out, or early return is reached
            while(tilesWaiting.length > 0){
                const nextTile = this.levelTiles.find(tile => tile.id === tilesWaiting[0]);
                //console.log('Next tile picked: ', nextTile);
                if (!nextTile) continue;

                // Remove currently checked tile from the waitlist
                tilesWaiting.shift();

                const nextTileConnections = nextTile.connections.map(conArr => !isNaN(Number(conArr[1])) ? Number(conArr[1]) : 0);

                for (const con of nextTileConnections){
                    // If the next tile has already been checked, skip it
                    if (!tilesChecked.has(con)) {
                        tilesChecked.set(con, nextTile.id);
                        // Add the next tile's connections to the waitlist
                        tilesWaiting.push(con);
                    }
                }
            }

            let failSafe = tilesChecked.size;

            let currentTile = targetCell.id;
            const path: Array<number> = [currentTile];
            while (currentTile !== 1 && failSafe > 0){
                const nextTile = tilesChecked.get(currentTile);
                //console.log('Next tile retrieved: ', nextTile);
                if (!nextTile) break;
                path.push(nextTile);
                currentTile = nextTile;
                failSafe--;
            }

            console.log('Pathing for cell %d: ', targetCell.id, path);
            targetCell.fillPathway(path);
        };

        const reachableCellsWithContents = this.tiledCells.filter(cell => cell.hasContents && this.reachableCells.includes(cell.id));
        console.log('Reachable Cells with contents: ', reachableCellsWithContents);
        for (const cell of reachableCellsWithContents){
            checkShortestPath(cell);
        }
    };

    get cells() {
        return this.tiledCells;
    }

    get reachable() {
        return this.reachableCells;
    }

    get unreachable() {
        return this.tiledCells.filter(cell => !this.reachableCells.includes(cell.id));
    }

    get unknown() {
        return this.tiledCells.filter(cell => this.reachableCells.includes(cell.id) && !this.encounteredCells.includes(cell.id));
    }

    get activeData() {
        return this.activeTile;
    }

    set active(newTile: TileData) {
        this.activeTile.updateInternals(newTile);
        this.__updateActiveCell();
    }


    // findFromBase(id: Con) {
    //     return this.levelTiles.find(tile => tile.id === id);
    // }

    // populateActiveTile() {
    //     this.activeTile = new MapTile(this.levelTiles[0]);
    //     return this.activeTile;
    // }

    __grabCellByID(id: Con) {
        // id will always be a number, this is due to level tiles being static json
        // The connections array is in the format of `[string, number][]` but typescript
        // makes that association declaration cost more time than its worth and this doesnt throw errors :)
        return this.tiledCells.find(cell => cell.id === id) ?? this.tiledCells[0];
    }

    __grabTileByID(id: Con) {
        // id will always be a number, this is due to level tiles being static json
        // The connections array is in the format of `[string, number][]` but typescript
        // makes that association declaration cost more time than its worth and this doesnt throw errors :)
        return this.levelTiles.find(tile => tile.id === id) ?? this.levelTiles[0];
    }

    handleMovement(direction: string) {
        // `MapTile.moveDirectionsID()` returns ["direction", id] as [1] therefore `id`
        const movingToID = this.activeTile.moveDirectionsID(direction);
        // Update activeTile and associated `CellData` based on id of tile moved to
        this.active = this.__grabTileByID(movingToID);

        // this.activeTile = new MapTile(this.findFromBase(movingToID) ?? this.populateActiveTile());
        // (this.tiledCells.find(c => c.id === this.activeData.id) ?? this.tiledCells[0]).activeCell = true;
    }

    filterMovement() {
        return (k: string) => this.activeTile.enabledConnections().some(d => d === k);
    }

    debugTiles(){
        for (const tile of this.levelTiles){
            console.log('Tile %d contains: ', tile.id, tile);
        }
    }

    debugCells(){
        for (const cell of this.tiledCells){
            console.log('Cell %d contains: ', cell.id, cell);
        }
    }

    PURGE() {
        this.levelTiles = [];
        this.tiledCells = [];
        this.encounteredCells = [];
        this.reachableCells = [];
        this.activeTile = new MapTile(emptyTile);
    }
}
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
    constructor(tileData: TileData){
        super(tileData);
        this.contents = [];
        this.hasContents = false;
        this.rolledContents = false;
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
    constructor() { 
        this.levelTiles = [];
        this.tiledCells = [];
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

    __loadBlankCells() {
        this.tiledCells = [...this.levelTiles.map(tile => new CellData(tile))];
    }

    __populateSpawnTile() {
        this.activeTile = new MapTile(this.levelTiles[0]);
        this.__updateActiveCell();
    }

    __updateActiveCell() {
        if (this.tiledCells.filter(tile => tile.activeCell).length > 0) {
            this.tiledCells.filter(tile => tile.activeCell).forEach((cell) => cell.activeCell = false);
        }
        (this.tiledCells.find(tile => tile.id === this.activeTile.id) ?? this.tiledCells[0]).activeCell = true;
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

    get cells() {
        return this.tiledCells;
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
        this.activeTile = new MapTile(emptyTile);
    }
}
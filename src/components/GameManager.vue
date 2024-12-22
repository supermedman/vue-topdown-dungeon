<script lang="ts">
import { defineComponent } from 'vue';

import MapDisplay from './MapDisplay.vue';

import level_one from '../levels/level1.json';

import { createLevel, loadLevel, MakerMap, simplifiedLevelGenTest } from '../utils/LevelFactory';

import { TileData, MapTile, CellData, CellManager } from '../typing/Tiles'; // 

const emptyTile = new MapTile({ id: 0, connections: [["", 0]]});
const emptyCell = new CellData({ id: 0, connections: [["", 0]]});

type ActiveCon = {
    N: boolean,
    E: boolean,
    S: boolean,
    W: boolean
};

export default defineComponent({
    components: {
        MapDisplay
    },
    data() {
        return {
            tiles: [...level_one.map(l => new TileData(l))],
            mapController: new CellManager(),
            watchedCells: [emptyCell],
            unreachableCells: [emptyCell],
            hiddenCells: [emptyCell],
            activeTile: emptyTile,
            activeConnections: {
                N: false,
                E: false,
                S: false,
                W: false
            },
            levelLoaded: false,
            debugEnabled: false,
            debugStates: {
                showConnectionStates: false,
                showConnectionIDs: false,
                showCellIDs: false,
                showCellPathing: false
            }
        }
    },
    created() {
        window.addEventListener('keydown', (e) => {
            if (!this.levelLoaded) return;
            let keySwitch = e.key;

            if (['ArrowUp', 'w'].includes(keySwitch)) {
                e.preventDefault();
                keySwitch = 'ArrowUp';
            } else if (['ArrowRight', 'd'].includes(keySwitch)) {
                e.preventDefault();
                keySwitch = 'ArrowRight';
            } else if (['ArrowDown', 's'].includes(keySwitch)) {
                e.preventDefault();
                keySwitch = 'ArrowDown';
            } else if (['ArrowLeft', 'a'].includes(keySwitch)) {
                e.preventDefault();
                keySwitch = 'ArrowLeft';
            }

            switch (keySwitch) {
                case 'ArrowUp':
                    this.move('N');
                    break;
                case 'ArrowRight':
                    this.move('E');
                    break;
                case 'ArrowDown':
                    this.move('S');
                    break;
                case 'ArrowLeft':
                    this.move('W');
                    break;
                default:
                    break;
            }
        });
    },
    methods: {
        loadLevel(){
            if (!this.levelLoaded) this.levelLoaded = true;
            else return;

            const theMaker = new MakerMap({ dim: 8 });

            console.log('Map Tiles Loaded: %d', this.mapController.populateBaseAdvanced(loadLevel, theMaker)); // createLevel({ dim: 4 })
            // this.mapController.debugTiles();
            // this.mapController.debugCells();
            console.log('Map Cells Loaded: %d', this.mapController.populateCells());

            this.mapController.populateCellsAdvanced();

            // NEW
            this.activeTile = this.mapController.activeData;
            // NEW
            this.updateMoveState();
        },
        resetLevel(){
            if (this.levelLoaded) this.levelLoaded = false;
            else return;

            this.mapController.PURGE();

            this.activeTile = emptyTile;
            this.clearActiveConnections();
        },
        move(direction: string){
            // NEW
            this.mapController.handleMovement(direction);

            this.activeTile = this.mapController.activeData;
            // NEW

            // OLD
            // const nextTileID = this.activeTile.moveDirectionsID(direction);

            // this.activeTile = new MapTile(this.tiles.find(t => t.id === nextTileID) ?? emptyTile);

            this.updateMoveState();
            // OLD
        },
        clearActiveConnections() {
            this.activeConnections.N = false;
            this.activeConnections.E = false;
            this.activeConnections.S = false;
            this.activeConnections.W = false;
        },
        updateMoveState(){
            if (!this.mapController || this.mapController.levelTiles.length <= 0) return console.warn('Level is not loaded!');
            
            //const movementFilter = (k: string) => this.mapController.activeTile?.enabledConnections().some((d) => k === d);
            const movementFilter = this.mapController.filterMovement();
            
            // console.log('Before connections cleared and updated: ', this.activeConnections);

            this.clearActiveConnections();

            type DirKey = keyof typeof this.activeConnections;

            function fillDirKeys(AC: ActiveCon): ReturnType<string[] extends DirKey ? any : any> {
                return Object.keys(AC).map((k) => k);
            }

            const staticDirList: Array<DirKey> = fillDirKeys(this.activeConnections);
            for (const statDir of staticDirList) {
                if (movementFilter(statDir)) this.activeConnections[statDir] = true;
            }

            // Object.entries(this.activeConnections)
            // .filter(([k,]) => movementFilter(k))
            // .reduce((acc, [k,]) => {
            //     this.activeConnections[k] = true;
            //     return acc;
            // }, {});

            console.log(
                'After connections cleared and updated: \nN: %s \nE: %s \nS: %s \nW: %s', 
                this.activeConnections.N,
                this.activeConnections.E,
                this.activeConnections.S,
                this.activeConnections.W
            );

            this.watchedCells = [...this.mapController.cells];
            this.unreachableCells = [...this.mapController.unreachable];
            this.hiddenCells = [...this.mapController.unknown];

            // OLD
            // if (!this.activeTile) return console.warn('Level is not loaded!');

            // console.log(this.activeTile);

            // const canMoveTo = (k: string) => this.activeTile.enabledConnections().some((d) => k === d);

            // console.log('Before connections cleared and updated: ', this.activeConnections);

            // this.clearActiveConnections();

            // Object.entries(this.activeConnections)
            // .filter(([k,]) => canMoveTo(k))
            // .reduce((acc, [k,]) => {
            //     this.activeConnections[k] = true;
            //     return acc;
            // }, {});

            // console.log('After connections cleared and updated: ', this.activeConnections);
            // OLD
        },
        testFn() {
            createLevel({ dim: 4 });
            // simplifiedLevelGenTest();
        },
        drawStep() {
            simplifiedLevelGenTest();
        }
    }
})
</script>

<!--<span :hidden="!levelLoaded" v-for="tile in tiles">{{ tile.connections }}</span>-->

<!-- 
:active-data="activeTile" 
    :level-data="tiles" 
    :map-manager="mapController" 
-->
<template>
    <div class="game-container">
        <div class="left-map-ui">
            <button style="button" :disabled="levelLoaded" @click="loadLevel">Start!</button>
            <button style="button" :disabled="!levelLoaded" @click="resetLevel">Reset!</button>
        </div>
        <div id="canvas-holder">
            <MapDisplay 
            :hidden="!levelLoaded" 
            :level-cells="watchedCells"
            :blocked-cells="unreachableCells"
            :unknown-cells="hiddenCells"
            :debug-mode="debugEnabled"
            :de-cell-i-d-s="debugStates.showCellIDs"
            :de-con-i-d-s="debugStates.showConnectionIDs"
            :de-con-states="debugStates.showConnectionStates"
            :de-cell-pathing="debugStates.showCellPathing"
            ></MapDisplay>
        </div>
        <div class="right-map-ui">
            <button style="button" @click="debugEnabled = !debugEnabled">Toggle Debug</button>
        </div>
    </div>
    <div class="game-state-controls">
        <!-- <button style="button" :disabled="levelLoaded" @click="loadLevel">Start!</button>
        <button style="button" :disabled="!levelLoaded" @click="resetLevel">Reset!</button> -->
        <!-- <button style="button" @click="debugEnabled = !debugEnabled">Toggle Debug</button> -->
        <!--<button style="button" @click="testFn">GEN LEVEL</button>-->
        
        <button style="button" :disabled="!activeConnections.W" @click="move('W')"><</button>
        <button style="button" :disabled="!activeConnections.N" @click="move('N')">^</button>
        <button style="button" :disabled="!activeConnections.S" @click="move('S')">v</button>
        <button style="button" :disabled="!activeConnections.E" @click="move('E')">></button>
    </div>
    <div class="debug-state-controls">
        <button style="button" :hidden="!debugEnabled" @click="debugStates.showCellIDs = !debugStates.showCellIDs">{{ (debugStates.showCellIDs) ? "Hide" : "Show" }} Cell IDs</button>
        <button style="button" :hidden="!debugEnabled" @click="debugStates.showConnectionStates = !debugStates.showConnectionStates">{{ (debugStates.showConnectionStates) ? "Hide" : "Show" }} Con States</button>
        <button style="button" :hidden="!debugEnabled" @click="debugStates.showConnectionIDs = !debugStates.showConnectionIDs">{{ (debugStates.showConnectionIDs) ? "Hide" : "Show" }} Con IDs</button>
        <button style="button" :hidden="!debugEnabled" @click="debugStates.showCellPathing = !debugStates.showCellPathing">{{ (debugStates.showCellPathing) ? "Hide" : "Show" }} Cell Pathing</button>
        <!--<button style="button" :hidden="!debugEnabled" @click="">{{ (debugStates.showCellIDs) ? "Hide" : "Show" }}</button>-->

    </div>
</template>
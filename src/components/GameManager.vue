<script lang="ts">
import { defineComponent } from 'vue';

import MapDisplay from './MapDisplay.vue';
import MapMakerControl from './MapMakerControl.vue';


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

/** TODO CELLS + UI
 *  - Add Level Generation Options UI
 *      - Add More options / Ideas for options
 *  - Add "Interaction" component handlers for cells with contents
 *  - Add content flow for each type of content "Interaction"
 *      - Enemy
 *      - Item
 *      - Event
 */

export default defineComponent({
    emits: ['changePage'],
    components: {
        MapDisplay,
        MapMakerControl
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
            mapMakerContainer: {
                dimPicked: 8,
                /* 
                    TODO: add additional user options for how a level will attempt 
                    to generate
                */
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

            // Group wasd and arrow keys to single direction pointer
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
                    // Catch invalid direction movement, this prevents an uneeded canvas render
                    if (!this.activeConnections.N) break;
                    this.move('N');
                break;
                case 'ArrowRight':
                    if (!this.activeConnections.E) break;
                    this.move('E');
                break;
                case 'ArrowDown':
                    if (!this.activeConnections.S) break;
                    this.move('S');
                break;
                case 'ArrowLeft':
                    if (!this.activeConnections.W) break;
                    this.move('W');
                break;
                default:
                break;
            }
        });
    },
    methods: {
        updateMapOptions(payload: number){
            // console.log('Event Recieved from radio check box:', payload);
            this.mapMakerContainer.dimPicked = payload;
        },
        loadLevel(dimArgs: number){
            if (!this.levelLoaded) this.levelLoaded = true;
            else return;

            const theMaker = new MakerMap({ dim: dimArgs });

            this.mapController.populateBaseAdvanced(loadLevel, theMaker);
            this.mapController.populateCells();

            //console.log('Map Tiles Loaded: %d', this.mapController.populateBaseAdvanced(loadLevel, theMaker)); // createLevel({ dim: 4 })
            // this.mapController.debugTiles();
            // this.mapController.debugCells();
            //console.log('Map Cells Loaded: %d', this.mapController.populateCells());

            this.mapController.populateCellsAdvanced();

            this.activeTile = this.mapController.activeData;
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
            this.mapController.handleMovement(direction);

            this.activeTile = this.mapController.activeData;
            
            this.updateMoveState();
        },
        clearActiveConnections() {
            this.activeConnections.N = false;
            this.activeConnections.E = false;
            this.activeConnections.S = false;
            this.activeConnections.W = false;
        },
        updateMoveState(){
            if (!this.mapController || this.mapController.levelTiles.length <= 0) return console.warn('Level is not loaded!');
            
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

            // console.log(
            //     'After connections cleared and updated: \nN: %s \nE: %s \nS: %s \nW: %s', 
            //     this.activeConnections.N,
            //     this.activeConnections.E,
            //     this.activeConnections.S,
            //     this.activeConnections.W
            // );

            this.watchedCells = [...this.mapController.cells];
            this.unreachableCells = [...this.mapController.unreachable];
            this.hiddenCells = [...this.mapController.unknown];
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

<template>
    <div class="home-button">
        <button @click="$emit('changePage', 'HomePage')">Return to Mainmenu</button>
    </div>
    <div class="game-container">
        <div class="left-map-ui">
            <button style="button" :disabled="levelLoaded" @click="loadLevel(mapMakerContainer.dimPicked)">Start!</button>
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
            <MapMakerControl 
            :level-active="levelLoaded"
            @update-dimension="updateMapOptions($event)"
            ></MapMakerControl>
        </div>
        <div class="right-map-ui">
            <button style="button" @click="debugEnabled = !debugEnabled">Toggle Debug</button>
        </div>
    </div>
    <div class="game-state-controls">
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
    </div>
</template>
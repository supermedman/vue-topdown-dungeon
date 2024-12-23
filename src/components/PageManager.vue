<script lang="ts">
import { defineComponent } from 'vue';
import GameManager from './GameManager.vue';
import HomePage from './HomePage.vue';

export default defineComponent({
    components: {
        GameManager,
        HomePage
    },
    data() {
        return {
            activePage: 'HomePage',
        }
    },
    methods: {
        updateActivePage(payload: string) {
            this.activePage = payload;
        }
    }
});
</script>

<!--
TODO

- Add second and third pages
- Second page: Task management
- Third page: Stats?
-->

<template>
    <component :is="activePage" @change-page="updateActivePage($event)"></component>
</template>
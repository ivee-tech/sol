<template>
  <div class="home">
    <Main msg="..."/>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Main from '@/components/Main.vue'; // @ is an alias to /src
import { TextAnalyticsClient, AzureKeyCredential } from "@azure/ai-text-analytics";
import sdk = require('microsoft-cognitiveservices-speech-sdk');


@Component<Home>({
  components: {
    Main,
  },
  mounted: function () {
    // ...
  },
})
export default class Home extends Vue {

}
</script>

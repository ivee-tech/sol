<template>
  <section>
    <div class="map" id="divMap" style='width: 100vw; height: 100vh;'>
    </div>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

declare const Microsoft: any;

@Component<MapComp>({
  components: {
  },
  mounted: function () {
    this.onMounted();
  },
})
export default class MapComp extends Vue {

  private map;
  private data;
  private analysisResult;
  private locations;

  private onMounted() {
    // const urlParams = new URLSearchParams(window.location.search);
    // this.q = urlParams.get('q');
    if(this.$route.query.data) {
      this.data = decodeURI(this.$route.query.data);
      this.analysisResult = JSON.parse(this.data);
      console.log(this.analysisResult);
      this.locations = this.analysisResult.entityResults[0].entities
        .filter(e => e.category === 'Location' && (e.subCategory === 'Geographical' || e.subCategory === 'GPE'))
        .map(e => e.text).join();
      console.log(this.locations);
    }
    (window as any).onLoadBingMapsApi = () => this.loadMap();
  }

  loadMap(): void {
      this.map = new Microsoft.Maps.Map(
          document.getElementById('divMap'),
          {
              credentials: '***',
          }
      );
      if(this.analysisResult.updatedLocation) {
        this.map.setCenter(this.analysisResult.updatedLocation);
      }
      else {
        Microsoft.Maps.loadModule('Microsoft.Maps.Search', () => {
          const map = this.map;
            const searchManager = new Microsoft.Maps.Search.SearchManager(map);
            const requestOptions = {
                bounds: this.map.getBounds(),
                where: this.locations,
                callback: (answer, userData) => {
                    map.setView({ bounds: answer.results[0].bestView });
                    const pin = new Microsoft.Maps.Pushpin(answer.results[0].location, { color: '#0f0', draggable: true });
                    map.entities.push(pin);
                    this.analysisResult.originalLocation = answer.results[0].location;
                    this.analysisResult.updatedLocation = answer.results[0].location;
                    // Microsoft.Maps.Events.addHandler(pin, 'drag', (e) => { this.highlight(e); });
                    // Microsoft.Maps.Events.addHandler(pin, 'dragend', (e) => { this.highlight(e); });
                    Microsoft.Maps.Events.addHandler(pin, 'dragstart', (e) => { this.onDragEnd(e); });
                }
            };
            searchManager.geocode(requestOptions);
        });
      }

    }
    
    onDragEnd(e) {
      console.log(e);
      this.analysisResult.updatedLocation = e.location;
      console.log('originalLocation: ', JSON.stringify(this.analysisResult.originalLocation));
      console.log('updatedLocation: ', JSON.stringify(this.analysisResult.updatedLocation));
    }
}
</script>

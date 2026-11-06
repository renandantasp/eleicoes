Lista vertical de métricas (substitui os chips): cada item mostra nome e unidade; o ativo vira bloco preenchido.
~~~jsx
<MetricList value={0} onChange={setMetric} items={[{id:'vant',label:'Vantagem',unit:'pp'},{id:'pctL',label:'% Lula',unit:'% dos válidos'}]} />
~~~
- Abaixo de 1080 px vira linha horizontal rolável (CSS).

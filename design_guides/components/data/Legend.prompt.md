Legenda de faixas discretas com forma fixa: 5×2 para divergente, 5×1 para sequencial. Faixa sem bairro fica esmaecida.
~~~jsx
import { legendRows } from './scales.js';
<Legend title="Vantagem" unit="pp" rows={legendRows(metric, scale, counts)} footnote="número no quadrado = bairros na faixa" />
~~~
- Nunca outro número de faixas. Pontas abertas ("até X" / "X ou mais").
- Use legendRows() de scales.js — ele já aplica as casas decimais do passo.

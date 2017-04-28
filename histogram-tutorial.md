# TensorBoard Histogram Dashboard

The TensorBoard Histogram Dashboard displays how the distribution of your data shifts by showing many time-sliced histograms. Let's explore how it works by diving into some distributions. 

## A Basic Example

Let's start with a simple case: a normally-distributed variable, where the mean shifts over time. We can generate it with code like this: 

```python
import tensorflow as tf

k = tf.placeholder(tf.float32)

# Make a normal distribution, with a shifting mean
mean_moving_normal = tf.random_normal(shape=[1000], mean=(5*k), stddev=1)
# Record that distribution into a histogram summary
tf.summary.histogram("normal/moving_mean", mean_moving_normal)

# Setup a session and summary writer
sess = tf.Session()
writer = tf.summary.FileWriter("/tmp/histogram_example")

# Setup a loop and write the summaries to disk
N = 400
for step in range(N):
  k_val = step/float(N)
  summ = sess.run(summaries, feed_dict={k: k_val})
  writer.add_summary(summ, global_step=step)
```

Once that code runs, we can load the data into TensorBoard via the command line:
`tensorboard --logdir=/tmp/histogram_example` and navigate to the Histogram Dashboard via the links at the top of TensorBoard. Then we can see a histogram visualization for our normally distributed data.

![image](https://cloud.githubusercontent.com/assets/1400023/25548884/95d5dd92-2c23-11e7-8d70-d7c108ddee0f.png)

`tf.summary.histogram` takes an arbitrarily-sized and shaped Tensor, and compresses it into a histogram data structure consisting of many bins with widths and counts. For example, let's say we want to organize the numbers `[0.5, 1.1, 1.3, 2.2, 2.9, 2.99]` into bins. We could make three bins: one containing everything from 0 to 1 (it would contain one element, 0.5), one containing everything from 1-2 (it would contain two elements, 1.1 and 1.3), and one containing everything from 2-3 (it would contain three elements: 2.2, 2.9 and 2.99). 

Each slice in the histogram visualizer is a single histogram, for one of the steps in our TensorFlow loop. Slices corresponding to earlier steps (e.g. step 0) are further back, and darker in color. Slices corresponding to recent steps (e.g. step 400) are close in the foreground, and darker in color. The y-axis on the right shows the step number.

You can mouse over the histogram to see tooltips with some more detailed information.
For example, in the following image we can see that the histogram at timestep 176 has a bin centered at 2.25 with 177 elements in that bin.

![image](https://cloud.githubusercontent.com/assets/1400023/25550038/b669f0fa-2c2a-11e7-8cfb-78f9a8b299c9.png)

## Overlay Mode

There is a control on the left of the dashboard that allows you to toggle the histogram mode from "offset" to "overlay":

![image](https://cloud.githubusercontent.com/assets/1400023/25550520/94ad8392-2c2e-11e7-887e-0b861a63a45d.png)

In "offset" mode, the visualization rotates 45 degrees, so that the individual histogram slices are no longer spread out in time, but instead are all plotted on the same y-axis. 

![image](https://cloud.githubusercontent.com/assets/1400023/25550079/1a9637be-2c2b-11e7-92e5-6943762426f1.png)
Now, each slice is a separate line on the chart, and the y-axis shows the item count within each bucket. Darker lines are older, earlier steps, and lighter lines are more recent, later steps. Once again, you can mouse over the chart to see some additional information.

![image](https://cloud.githubusercontent.com/assets/1400023/25550097/415b448e-2c2b-11e7-93ad-4c6f6e1ffe4e.png)

In general, the overlay visualization is useful if you want to directly compare the counts of different histograms.

## Multimodal Distributions

One thing the Histogram Dashboard is great for is visualizing multimodal distributions. Let's construct a simple bimodal distribution by concatenating the outputs from two different normal distributions. The code will look like this:

```python
import tensorflow as tf

k = tf.placeholder(tf.float32)

# Make a normal distribution, with a shifting mean
mean_moving_normal = tf.random_normal(shape=[1000], mean=(5*k), stddev=1)
# Record that distribution into a histogram summary
tf.summary.histogram("normal/moving_mean", mean_moving_normal)

# Make a normal distribution with shrinking variance
variance_shrinking_normal = tf.random_normal(shape=[1000], mean=0, stddev=1-(k))
# Record that distribution too
tf.summary.histogram("normal/shrinking_variance", variance_shrinking_normal)

# Let's combine both of those distributions into one dataset
normal_combined = tf.concat([mean_moving_normal, variance_shrinking_normal], 0)
# We add another histogram summary to record the combined distribution
tf.summary.histogram("normal/bimodal", normal_combined)

summaries = tf.summary.merge_all()

# Setup a session and summary writer
sess = tf.Session()
writer = tf.summary.FileWriter("/tmp/histogram_example")

# Setup a loop and write the summaries to disk
N = 400
for step in range(N):
  k_val = step/float(N)
  summ = sess.run(summaries, feed_dict={k: k_val})
  writer.add_summary(summ, global_step=step)
```

You already remember our "moving mean" normal distribution from the example above. Now we also have a "shrinking variance" distribution. Side-by-side, they look like this:
![image](https://cloud.githubusercontent.com/assets/1400023/25550196/1969a05a-2c2c-11e7-8146-fc55f60ecd08.png)

When we concatenate them, we get a chart that clearly reveals the divergent, bimodal structure:
![image](https://cloud.githubusercontent.com/assets/1400023/25550223/4440f3c8-2c2c-11e7-9d1b-c2c4f70e89f2.png)

## Some more distributions

Just for fun, let's generate and visualize a few more distributions, and then combine them all into one chart. Here's the code we'll use:

```python
import tensorflow as tf

k = tf.placeholder(tf.float32)

# Make a normal distribution, with a shifting mean
mean_moving_normal = tf.random_normal(shape=[1000], mean=(5*k), stddev=1)
# Record that distribution into a histogram summary
tf.summary.histogram("normal/moving_mean", mean_moving_normal)

# Make a normal distribution with shrinking variance
variance_shrinking_normal = tf.random_normal(shape=[1000], mean=0, stddev=1-(k))
# Record that distribution too
tf.summary.histogram("normal/shrinking_variance", variance_shrinking_normal)

# Let's combine both of those distributions into one dataset
normal_combined = tf.concat([mean_moving_normal, variance_shrinking_normal], 0)
# We add another histogram summary to record the combined distribution
tf.summary.histogram("normal/bimodal", normal_combined)

# Add a gamma distribution
gamma = tf.random_gamma(shape=[1000], alpha=k)
tf.summary.histogram("gamma", gamma)

# And a poisson distribution
poisson = tf.random_poisson(shape=[1000], lam=k)
tf.summary.histogram("poisson", poisson)

# And a uniform distribution
uniform = tf.random_uniform(shape=[1000], maxval=k*10)
tf.summary.histogram("uniform", uniform)

# Finally, combine everything together!
all_combined = tf.concat([mean_moving_normal, variance_shrinking_normal, gamma, poisson, uniform], 0)
tf.summary.histogram("all_combined", all_combined)

summaries = tf.summary.merge_all()

# Setup a session and summary writer
sess = tf.Session()
writer = tf.summary.FileWriter("/tmp/histogram_example")

# Setup a loop and write the summaries to disk
N = 400
for step in range(N):
  k_val = step/float(N)
  summ = sess.run(summaries, feed_dict={k: k_val})
  writer.add_summary(summ, global_step=step)
```
### Gamma Distribution
![image](https://cloud.githubusercontent.com/assets/1400023/25550262/89712fda-2c2c-11e7-8266-329cd68185b1.png)

### Uniform Distribution
![image](https://cloud.githubusercontent.com/assets/1400023/25550268/9bc68022-2c2c-11e7-8090-0d403a8b993b.png)
Notice how the selection of steps is a bit uneven - there are a few gaps visible between slices. This is because TensorBoard uses [reservoir sampling](https://en.wikipedia.org/wiki/Reservoir_sampling) to keep a subset of all the histograms, to save on memory. Reservoir sampling guarantees a uniform distribution over all the available slices, but it is a randomized algorithm, so the results are a bit uneven.

### Poisson Distribution
![image](https://cloud.githubusercontent.com/assets/1400023/25550299/e5eb7b58-2c2c-11e7-91e5-f984be2b5f8a.png)
The poisson distribution is defined over the integers. So, all of the values being generated are perfect integers. The histogram compression moves the data into floating-point bins, with the result that the visualization shows little bumps over the integer values rather than perfect spikes.

### All Together Now
Finally, we can concatenate all of the data into one funny-looking curve.
![image](https://cloud.githubusercontent.com/assets/1400023/25550328/129673ec-2c2d-11e7-9721-3d5a5b34a5bb.png)



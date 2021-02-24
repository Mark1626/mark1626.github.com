---
layout: post
title: "Setting up a distributed in-memory cache in Spring with Hazelcast"
author: Nimalan
tags: dev spring hazelcast k8s
---

The whole source code can be found [here](https://github.com/Mark1626/Paraphernalia/tree/master/spring-hazelcast)

## Architecture

![Spring Hazelcast](/assets/images/spring-hazelcast.svg)

---

## Setting up a distributed in-memory hazelcast cluster

We'll start by adding hazelcast to our dependency

```groovy
dependency {
  // other dependencies
  implementation 'org.springframework.boot:spring-boot-starter-cache'

  implementation 'com.hazelcast:hazelcast-all:4.0.1'
}
```

Let's add an endpoint which takes long to respond. The service method below will take `5s` to respond, we'll add a 
`@Cachable` to cache the response of this method in our hazelcast cluster

```groovy

@RestController
class PingController {

    private final GreetService greetService;

    PingController(GreetService greetService) {
        this.greetService = greetService;
    }

    @GetMapping("/greet")
    ResponseEntity<String> sayPong(@RequestParam("name") String name) {
        return ResponseEntity.ok(greetService.greet(name));
    }
}

@Service
class GreetService {

    @Cacheable("greetings")
    String greet(String name) {
        return greetPerson(name)
    }

    private String greetPerson(String name) {
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
        return "Hello" + name;
    }
}
```

Now configure hazelcast by creating a `hazelcast.yaml`.

```yaml
# hazelcast.yaml
hazelcast:
  network:
    join:
      multicast:
        enabled: true
```

Start two or more instances of the app in different ports. Since multicast is enabled 
the hazelcast instances will connect with other instances in the network and form a cluster. Note that in the logs of the instances you will see that a cluster has been created.

Logs from instance A

```
<date> 16:49:01.528  INFO 29229 --- [.IO.thread-in-0] c.h.internal.nio.tcp.TcpIpConnection     : [<ip>]:<portA> [dev] [4.0.1] Initialized new cluster connection between /<ip>:<portA> and /<ip>:51302
<date> 16:49:07.532  INFO 29229 --- [ration.thread-0] c.h.internal.cluster.ClusterService      : [<ip>]:<portA> [dev] [4.0.1]

Members {size:2, ver:4} [
        Member [<ip>]:<portA> - 2f8cbb60-1823-4fba-8d13-2fa9dbf89822 this
        Member [<ip>]:<portB> - 7fb07cd0-5a46-422d-801d-05e6da0b9a63
]

<date> 16:49:07.793  INFO 29229 --- [hertz.migration] c.h.i.partition.impl.MigrationManager    : [<ip>]:<portA> [dev] [4.0.1] Repartitioning cluster data. Migration tasks count: 271
<date> 16:49:09.130  INFO 29229 --- [hertz.migration] c.h.i.partition.impl.MigrationThread     : [<ip>]:<portA> [dev] [4.0.1] All migration tasks have been completed. (repartitionTime=<date> 16:49:07 UTC 2020, plannedMigrations=271, completedMigrations=271, remainingMigrations=0, totalCompletedMigrations=542, elapsedMigrationTime=332ms, totalElapsedMigrationTime=332ms)
```

Logs from instance B

```
<date> 16:49:01.416  INFO 32286 --- [           main] com.hazelcast.core.LifecycleService      : [<ip>]:<portB> [dev] [4.0.1] [<ip>]:<portB> is STARTING
<date> 16:49:01.507  INFO 32286 --- [           main] c.h.i.cluster.impl.MulticastJoiner       : [<ip>]:<portB> [dev] [4.0.1] Trying to join to discovered node: [<ip>]:<portA>
<date> 16:49:01.519  INFO 32286 --- [cached.thread-3] c.h.internal.nio.tcp.TcpIpConnector      : [<ip>]:<portB> [dev] [4.0.1] Connecting to /<ip>:<portA>, timeout: 10000, bind-any: true
<date> 16:49:01.530  INFO 32286 --- [.IO.thread-in-0] c.h.internal.nio.tcp.TcpIpConnection     : [<ip>]:<portB> [dev] [4.0.1] Initialized new cluster connection between /<ip>:51302 and /<ip>:<portA>
<date> 16:49:07.542  INFO 32286 --- [ration.thread-0] c.h.internal.cluster.ClusterService      : [<ip>]:<portB> [dev] [4.0.1]

Members {size:2, ver:4} [
        Member [<ip>]:<portA> - 2f8cbb60-1823-4fba-8d13-2fa9dbf89822
        Member [<ip>]:<portB> - 7fb07cd0-5a46-422d-801d-05e6da0b9a63 this
]
```

Values cached in Instance A will be available in instance B. We now have a basic cluster setup

---

## Moving the setup to k8s

In k8s we can't do a simple multicast to form the cluster. Hazelcast has member discovery [plugin](https://github.com/hazelcast/hazelcast-kubernetes) to make this easier.

```groovy
dependency {
  // other dependencies
  implementation 'com.hazelcast:hazelcast-all:4.0.1'
  implementation 'com.hazelcast:hazelcast-kubernetes:2.2.1'
}
```

Disable multicast and mention the `Namespace` and the `Service` where our instances will be present.

```yml
# hazelcast.yaml
hazelcast:
  network:
    join:
      multicast:
        enabled: false
      kubernetes:
        enabled: true
        namespace: app
        service-name: spring-hazelcast-service
```

We would need to create a `Service`. As per hazelcast's docs any service should would. For this example I'm creating a headless service

```yml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: spring-hazelcast-service
spec:
  selector:
    app: spring-hazelcast
  clusterIP: None
  ports:
    - name: app-server
      protocol: TCP
      port: 8080
      targetPort: 8080
    - name: hazel-cache
      protocol: TCP
      port: 5701
      targetPort: 5701
```

For the service discovery to work the service should be able to view other pods in the cluster.

```yml
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: spring-hazelcast-rbac
roleRef:
  apiGroup: rbac. authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
- kind: ServiceAccount
  name: default
  namespace: app
```

---

## RBAC

We now have a hazelcast cluster with service discovery but note we are using the `default` `ServiceAccount` and providing pods with a `ClusterRole`, in a real world scenario we would want to have least privilege possible for our pods. Let's try to make the RBAC more fine grained

Create a separate service account for the pods which are running as hazelcast

```yaml
# serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  namespace: app
  name: hazelcast-service-discovery
```

We'll use this service account in the deployment.

```yaml
# statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: spring-hazelcast-deployment
  ...
  ...
spec:
    ...
    ...
    spec:
      serviceAccount: hazelcast-service-discovery
      containers:
        - name: spring-hazelcast
        ...
        ...
```

Now let's create a `Role` in the namespace which has `get`, and `list` access to the `pods` and `endpoints`. Next we'll bind the new role to the `ServiceAccount`

```yaml
# rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: hazelcast-role
  namespace: app
rules:
- apiGroups:
  - ""
  resources:
  - pods
  - endpoints
  verbs:
  - get
  - list
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: spring-hazelcast-rbac
  namespace: app
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: hazelcast-role
subjects:
- kind: ServiceAccount
  name: hazelcast-service-discovery
  namespace: app
```

With this we have created an distributed embedded in-memory cache.

The whole project can be found [here](https://github.com/Mark1626/Paraphernalia/tree/master/spring-hazelcast)

**Closing Notes and thoughts:**
- The RBAC can be further made fine grained by specifying the `resourceName` in the `Role`, I'll let it at this stage as the role is only applied to hazelcast instances. 
- Other than RBAC we can use a DNS based lookup for service discovery

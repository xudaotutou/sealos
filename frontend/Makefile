ifeq ($(OS),Windows_NT)
  SHELL := powershell.exe
  DOCKER_USERNAME := $(DOCKER_USERNAME)
else
  UNAME_S := $(shell uname -s)
  ifeq ($(UNAME_S),Linux)
    SHELL := /bin/bash
    CURRENT_USER := $(shell echo $$USER)
  endif
  ifeq ($(UNAME_S),Darwin)
    SHELL = /usr/bin/env bash
    CURRENT_USER := $(shell id -un)
  endif
endif

ifneq ($(strip $(DOCKER_USERNAME)),)
  imageOwner := $(DOCKER_USERNAME)/
else
  imageOwner :=
endif

# build image
buildTargets := \
	desktop \
	providers/terminal \
	providers/adminer \
	providers/bytebase \
	providers/costcenter \
	providers/dbprovider \
	providers/applaunchpad
buildTargets-all := $(addprefix image-build-,$(buildTargets))
# Generate phony targets using foreach and eval.
$(foreach target,$(buildTargets),$(eval .PHONY: image-build-$($(target))))
$(foreach target,$(buildTargets),$(eval .PHONY: dev-$($(target))))
.PHONY: all dev-desktop image-prebuild deps-build

all: image-prebuild $(buildTargets-all)
all-publish: image-prebuild $(addprefix image-publish-,$(buildTargets))
fetch-deps: pnpm-lock.yaml
	pnpm fetch
deps-build: fetch-deps
	pnpm -r --offline --filter=./packages/* install
	pnpm -r --offline --filter=./packages/* build
dev-providers/%: deps-build
	pnpm -r --offline --filter=./providers/$* install
	pnpm -r --offline --filter=./providers/$* dev
dev-%: deps-build
	pnpm -r --offline --filter=$* install
	pnpm -r --offline --filter=$* dev
# prebuild-image-for -j



image-prebuild: pnpm-lock.yaml
	docker build --target deps . -t $(imageOwner)sealos-deps:dev

image-build-providers/%: image-prebuild
	docker build -t $(imageOwner)sealos-$*-frontend:dev --build-arg path=providers/$* --build-arg name=$* . 
image-build-%: image-prebuild
	docker build -t $(imageOwner)sealos-$*-frontend:dev --build-arg path=$* --build-arg name=$* . 

image-publish-providers/%: image-build-providers/%
	docker push $(imageOwner)sealos-$*-frontend:dev
image-publish-%: image-build-%
	docker push $(imageOwner)sealos-$*-frontend:dev
# Default target to run all builds.
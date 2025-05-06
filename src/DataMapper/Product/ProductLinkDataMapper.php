<?php

namespace App\DataMapper\Product;

use App\DataMapper\AbstractDataMapper;

class ProductLinkDataMapper extends AbstractDataMapper
{
    public function toArray($request): array
    {
        $linkGenerator = $this->resource->getClass()->getLinkGenerator();

        return [
            'id' => $this->resource->getId(),
            'image' => $this->resource->getImage(),
            'slug' => $linkGenerator->generate($this->resource)
        ];
    }
}

<?php
namespace App\Controller;

use Pimcore\Model\DataObject\AbstractObject;
use Pimcore\Model\DataObject\FAQ as DataObjectFAQ;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

use function PHPUnit\Framework\throwException;

class FaqController extends AbstractController
{
    public function faqListAction(Request $request) : Response
    {
        $paramsBag = [];

        $type = $request->attributes->get('type') ?: $request->query->get('type');
        if ($type == 'object') {
            AbstractObject::setGetInheritedValues(true);
            $id = $request->attributes->get('id') ?: $request->query->get('id');
            $faq = DataObjectFAQ::getById($id);
            if (!$faq instanceof DataObjectFAQ || !$faq->isPublished())
            {
                throw new NotFoundHttpException('Faq not Found.');
            }
            $paramsBag['faq'] = $faq;

            return $this->render('faq/faq-list.html.twig', $paramsBag);
        }
        throw new NotFoundHttpException('Faq not Found.');

    }
}
